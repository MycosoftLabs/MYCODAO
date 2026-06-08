#!/usr/bin/env python3
"""Free RAM on MycoDAO VM 198: Docker prune, drop page cache, ensure swap."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")


def load_creds() -> None:
    for creds in (
        ROOT / ".credentials.local",
        ROOT.parent / "MAS" / "mycosoft-mas" / ".credentials.local",
        Path.home() / ".mycosoft-credentials",
    ):
        if not creds.is_file():
            continue
        for line in creds.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
        return


def run(ssh, cmd: str, timeout: int = 180) -> None:
    print(f">>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out[-4000:])
    if err:
        print(err[-1500:], file=sys.stderr)
    if code != 0:
        print(f"exit {code}", file=sys.stderr)


def main() -> int:
    load_creds()
    import paramiko

    user = os.environ.get("VM_SSH_USER", "mycosoft")
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
    key_path = ROOT / ".ssh-pulse-deploy" / "id_ed25519"
    if not key_path.is_file():
        print(f"Missing SSH key: {key_path}", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.Ed25519Key.from_private_key_file(str(key_path))
    print(f"Connecting to {user}@{VM_HOST}...")
    ssh.connect(VM_HOST, username=user, pkey=pkey, timeout=30)

    sudo = "sudo"
    if password:
        esc = password.replace("'", "'\"'\"'")
        sudo = f"echo '{esc}' | sudo -S"

    run(ssh, "echo '=== BEFORE ==='; free -h; swapon --show; df -h / /opt")
    run(ssh, 'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" || true')
    run(ssh, "docker builder prune -af || true", timeout=600)
    run(ssh, "docker image prune -af || true", timeout=300)
    run(ssh, "docker container prune -f || true", timeout=120)
    for name in ("mycodao-green", "mycodao-blue", "mycodao-proxy"):
        run(ssh, f"docker rm -f {name} 2>/dev/null || true")
    run(ssh, f"{sudo} sync")
    run(ssh, f"{sudo} sh -c 'echo 3 > /proc/sys/vm/drop_caches'")
    run(ssh, f"{sudo} sysctl -w vm.swappiness=60 || true")
    swap_script = f"""
if ! swapon --show 2>/dev/null | grep -q .; then
  if [ ! -f /swapfile ]; then
    {sudo} fallocate -l 4G /swapfile 2>/dev/null || {sudo} dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
    {sudo} chmod 600 /swapfile
    {sudo} mkswap /swapfile
  fi
  {sudo} swapon /swapfile 2>/dev/null || true
fi
swapon --show || true
"""
    run(ssh, swap_script, timeout=300)
    run(ssh, "echo '=== AFTER ==='; free -h; swapon --show")
    run(ssh, "dmesg -T 2>/dev/null | grep -i 'killed process' | tail -8 || true")

    ssh.close()
    print("\nVM memory cleanup complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
