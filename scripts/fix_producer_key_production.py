#!/usr/bin/env python3
"""Set NEWS_PRODUCER_API_KEY on MycoDAO VM 198 and restart app container."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")
REMOTE_DIR = os.environ.get("MYCODAO_REMOTE_DIR", "/opt/mycodao")


def load_env_files() -> None:
    for env_path in (ROOT / ".env.local", ROOT / ".env.production"):
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

    creds_candidates = [
        ROOT / ".credentials.local",
        ROOT.parent / "MAS" / "mycosoft-mas" / ".credentials.local",
        Path.home() / ".mycosoft-credentials",
    ]
    for creds in creds_candidates:
        if not creds.is_file():
            continue
        for line in creds.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
        break


def patch_env_content(raw: str, key: str, value: str) -> str:
    lines = raw.splitlines()
    keys_seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            out.append(line)
            continue
        k = line.split("=", 1)[0].strip()
        if k == "NEWS_PRODUCER_API_KEY":
            out.append(f"NEWS_PRODUCER_API_KEY={value}")
            keys_seen.add(k)
        else:
            out.append(line)
    if "NEWS_PRODUCER_API_KEY" not in keys_seen:
        out.append(f"NEWS_PRODUCER_API_KEY={value}")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    load_env_files()
    producer_key = os.environ.get("NEWS_PRODUCER_API_KEY", "").strip()
    if not producer_key:
        print("NEWS_PRODUCER_API_KEY missing in .env.local / env", file=sys.stderr)
        return 1

    import paramiko

    key_path = Path(
        os.environ.get(
            "VM_SSH_PRIVATE_KEY_OPENSSH",
            str(ROOT / ".ssh-pulse-deploy" / "id_ed25519"),
        )
    )
    if not key_path.is_file():
        print(f"SSH key not found: {key_path}", file=sys.stderr)
        return 1

    user = os.environ.get("VM_SSH_USER", "mycosoft")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.Ed25519Key.from_private_key_file(str(key_path))
    print(f"Connecting to {user}@{VM_HOST}...")
    ssh.connect(VM_HOST, username=user, pkey=pkey, timeout=30)

    env_path = f"{REMOTE_DIR}/.env.production"
    sftp = ssh.open_sftp()
    try:
        with sftp.file(env_path, "r") as f:
            raw = f.read().decode("utf-8", errors="replace")
    except OSError:
        raw = ""
    updated = patch_env_content(raw, "NEWS_PRODUCER_API_KEY", producer_key)
    with sftp.file(env_path, "w") as f:
        f.write(updated)
    sftp.close()
    print("Updated NEWS_PRODUCER_API_KEY in .env.production")

    restart_cmd = (
        f"cd {REMOTE_DIR} && "
        f"docker compose --env-file .env.production up -d mycodao && "
        f"docker compose --env-file .env.production --profile tunnel up -d"
    )
    _, stdout, stderr = ssh.exec_command(restart_cmd, timeout=180)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out[-2000:])
    if err:
        print(err[-2000:], file=sys.stderr)
    if code != 0:
        print("docker compose restart failed", file=sys.stderr)
        ssh.close()
        return 1

    time.sleep(8)
    test_patch = (
        "curl -s -o /dev/null -w '%{http_code}' "
        "-X PATCH http://127.0.0.1:3004/api/news/producer "
        "-H 'Content-Type: application/json' "
        "-H 'x-news-producer-key: WRONG' "
        "-d '{\"returnToLive\":true}'"
    )
    _, stdout, _ = ssh.exec_command(test_patch, timeout=30)
    wrong_code = stdout.read().decode().strip()
    print(f"PATCH with wrong key -> HTTP {wrong_code} (expect 401)")

    # Verify container sees the env var (length only, not value)
    _, stdout, _ = ssh.exec_command(
        "docker exec mycodao-app printenv NEWS_PRODUCER_API_KEY | wc -c",
        timeout=30,
    )
    key_len = stdout.read().decode().strip()
    print(f"Container NEWS_PRODUCER_API_KEY length: {key_len} chars (incl newline)")

    ssh.close()
    print("Producer key applied. Save key in producer dashboard and retry cut-to-URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
