#!/usr/bin/env python3
"""Mount BLOCKS NAS on MycoDAO VM 198, sync producer code, rebuild Docker, verify APIs."""
from __future__ import annotations

import os
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")
REMOTE_DIR = os.environ.get("MYCODAO_REMOTE_DIR", "/opt/mycodao")


def load_creds() -> None:
    for env_path in (ROOT / ".env.local", ROOT / ".env.production"):
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    candidates = [
        ROOT / ".credentials.local",
        ROOT.parent / "MAS" / "mycosoft-mas" / ".credentials.local",
        Path.home() / ".mycosoft-credentials",
    ]
    for creds in candidates:
        if not creds.is_file():
            continue
        for line in creds.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
        return


def sftp_mkdirs(sftp, path: str) -> None:
    parts = path.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except OSError:
            try:
                sftp.mkdir(cur)
            except OSError:
                pass


def upload_tree(sftp, local: Path, remote: str, patterns: list[str]) -> None:
    """Upload files matching glob patterns."""
    uploaded: set[str] = set()
    for pattern in patterns:
        for local_file in ROOT.glob(pattern):
            if local_file.is_dir():
                continue
            rel = local_file.relative_to(ROOT).as_posix()
            if rel in uploaded:
                continue
            uploaded.add(rel)
            remote_path = f"{remote}/{rel}"
            sftp_mkdirs(sftp, str(Path(remote_path).parent).replace("\\", "/"))
            data = local_file.read_bytes()
            if rel.endswith(".sh"):
                data = data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
            with sftp.file(remote_path, "w") as dst:
                dst.write(data)
            print(f"  uploaded {rel}")


def ensure_env_production(sftp, ssh) -> None:
    env_path = f"{REMOTE_DIR}/.env.production"
    producer_key = os.environ.get("NEWS_PRODUCER_API_KEY", "").strip()
    required = {
        "BLOCKS_NAS_ROOT": "/mnt/nas/mycodao/BLOCKS",
        "BLOCKS_NAS_CIFS_URL": "//192.168.0.105/MYCODAO/BLOCKS",
        "BLOCKS_NAS_SHARE": "//192.168.0.105/MYCODAO",
        "NAS_HOST": "192.168.0.105",
        "NAS_SMB_USER": os.environ.get("NAS_SMB_USER", "mycosoft"),
    }
    if producer_key:
        required["NEWS_PRODUCER_API_KEY"] = producer_key
    try:
        with sftp.file(env_path, "r") as f:
            raw = f.read().decode("utf-8", errors="replace")
    except OSError:
        raw = ""
    lines = raw.splitlines()
    keys_seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            out.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in required:
            out.append(f"{key}={required[key]}")
            keys_seen.add(key)
        else:
            out.append(line)
    for key, val in required.items():
        if key not in keys_seen:
            out.append(f"{key}={val}")
    content = "\n".join(out).rstrip() + "\n"
    with sftp.file(env_path, "w") as f:
        f.write(content)
    print("  updated .env.production (BLOCKS NAS + producer key)")


def local_build() -> None:
    """Build on dev machine — VM has only ~3.8GB RAM and OOMs during Vite/Next in Docker."""
    standalone = ROOT / ".next" / "standalone"
    if standalone.is_dir() and os.environ.get("MYCODAO_SKIP_LOCAL_BUILD") == "1":
        print("Skipping local build (MYCODAO_SKIP_LOCAL_BUILD=1, using existing .next)")
        return
    print("Building locally (npm run build)...")
    subprocess.run(
        ["npm", "run", "build"],
        cwd=ROOT,
        check=True,
        env={**os.environ, "NEXT_TELEMETRY_DISABLED": "1"},
    )
    if not standalone.is_dir():
        raise RuntimeError("Local build did not produce .next/standalone")


def pack_prebuilt_artifacts() -> Path:
    needed = [
        ROOT / "public",
        ROOT / ".next" / "standalone",
        ROOT / ".next" / "static",
        ROOT / "Dockerfile.prebuilt",
    ]
    for path in needed:
        if not path.exists():
            raise FileNotFoundError(f"Missing build artifact: {path}")
    tmp = Path(tempfile.gettempdir()) / "mycodao-prebuilt.tgz"
    with tarfile.open(tmp, "w:gz") as tar:
        for path in needed:
            tar.add(path, arcname=path.relative_to(ROOT).as_posix())
    print(f"Packed prebuilt artifacts ({tmp.stat().st_size // (1024 * 1024)} MB)")
    return tmp


def upload_prebuilt(sftp, tarball: Path) -> None:
    remote = f"{REMOTE_DIR}/deploy-prebuilt.tgz"
    print(f"Uploading {tarball.name} -> {remote}")
    sftp.put(str(tarball), remote)


def run_cmd(ssh, cmd: str, timeout: int = 3600) -> tuple[int, str, str]:
    print(f">>> {cmd[:120]}...")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        safe = out[-6000:].encode("ascii", errors="replace").decode("ascii")
        print(safe)
    if err:
        print(err[-2000:], file=sys.stderr)
    return code, out, err


def main() -> int:
    load_creds()
    import paramiko

    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
    nas_pass = os.environ.get("NAS_SMB_PASSWORD") or os.environ.get("NAS_PASSWORD", "")

    key_path = Path(
        os.environ.get(
            "VM_SSH_PRIVATE_KEY_OPENSSH",
            str(ROOT / ".ssh-pulse-deploy" / "id_ed25519"),
        )
    )
    if not key_path.is_file():
        print(f"SSH key not found: {key_path}", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{VM_HOST} (key auth)...")
    pkey = paramiko.Ed25519Key.from_private_key_file(str(key_path))
    ssh.connect(VM_HOST, username=user, pkey=pkey, timeout=30)

    local_build()
    tarball = pack_prebuilt_artifacts()

    sftp = ssh.open_sftp()
    upload_prebuilt(sftp, tarball)

    # Git pull first, then overlay local producer/NAS files (covers unpushed commits)
    run_cmd(
        ssh,
        f"cd {REMOTE_DIR} && git fetch origin && git checkout main && git reset --hard origin/main",
        timeout=300,
    )

    upload_tree(
        sftp,
        ROOT,
        REMOTE_DIR,
        [
            "scripts/setup_blocks_nas_mount.sh",
            "scripts/apply_blocks_nas_production.py",
            "docker-compose.yml",
            "lib/news-channel-embed.ts",
            "lib/server/*.ts",
            "app/api/news/**/*.ts",
            "data/news-channel-schedule.json",
            "myco-pulse/src/**/*.tsx",
            "myco-pulse/src/**/*.ts",
            "lib/types.ts",
            "lib/adapters/funding.ts",
            "lib/adapters/researchhub.ts",
            "lib/adapters/research.ts",
            "lib/adapters/rss-news-parser.ts",
            "lib/fungal-research.ts",
            "app/api/funding/**/*.ts",
            "app/api/researchhub/**/*.ts",
            "app/api/research/route.ts",
            "public/blocks/**",
            "public/broadcast/**",
            "myco-pulse/public/broadcast/**",
            "lib/news-bumper.ts",
            "docker-compose.blue-green.yml",
            "deploy/nginx/**",
            "scripts/blue-green-deploy.sh",
            "Dockerfile.prebuilt",
            ".dockerignore",
        ],
    )

    nas_env = f"NAS_SMB_PASSWORD='{nas_pass}' " if nas_pass else ""
    nas_share = os.environ.get("BLOCKS_NAS_SHARE", "//192.168.0.105/MYCODAO")
    smb_user = os.environ.get("NAS_SMB_USER", "mycosoft")

    sudo_prefix = "sudo -E"
    if password:
        vm_pass_esc = password.replace("'", "'\"'\"'")
        sudo_prefix = f"echo '{vm_pass_esc}' | sudo -S -E"
    mount_cmd = (
        f"cd {REMOTE_DIR} && "
        f"chmod +x scripts/setup_blocks_nas_mount.sh && "
        f"export BLOCKS_NAS_SHARE='{nas_share}' NAS_MOUNT_PATH='/mnt/nas/mycodao/BLOCKS' "
        f"NAS_SMB_USER='{smb_user}' {nas_env}&& "
        f"{sudo_prefix} bash scripts/setup_blocks_nas_mount.sh"
    )
    code, _, _ = run_cmd(ssh, mount_cmd, timeout=600)
    if code != 0:
        print("NAS mount failed", file=sys.stderr)
        ssh.close()
        return 1

    ensure_env_production(sftp, ssh)
    sftp.close()

    deploy_cmd = (
        f"cd {REMOTE_DIR} && "
        f"tar xzf deploy-prebuilt.tgz && "
        f"docker build -f Dockerfile.prebuilt -t mycodao:latest . && "
        f"docker compose --env-file .env.production up -d mycodao && "
        f"docker compose --env-file .env.production --profile tunnel up -d && "
        f"docker exec -u 0 mycodao-app chown -R nextjs:nodejs /app/data"
    )
    code, _, _ = run_cmd(ssh, deploy_cmd, timeout=7200)
    if code != 0:
        print("Docker build/deploy failed", file=sys.stderr)
        ssh.close()
        return 1

    time.sleep(12)
    verify_cmds = [
        "findmnt /mnt/nas/mycodao/BLOCKS || true",
        "curl -sf http://127.0.0.1:3004/api/health | head -c 200",
        "curl -sf http://127.0.0.1:3004/api/news/producer/media | head -c 800",
    ]
    for cmd in verify_cmds:
        run_cmd(ssh, cmd, timeout=60)

    ssh.close()
    print("\n=== Production BLOCKS NAS setup complete ===")
    print("Verify: https://blocks.mycodao.com/api/news/producer/media")
    print("Producer: https://blocks.mycodao.com/blocks/#producer")
    return 0


if __name__ == "__main__":
    sys.exit(main())
