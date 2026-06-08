#!/usr/bin/env python3
"""Upload news-channel-schedule.json to VM 198 and copy into running container."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")
REMOTE_DIR = os.environ.get("MYCODAO_REMOTE_DIR", "/opt/mycodao")
LOCAL = ROOT / "data" / "news-channel-schedule.json"


def main() -> int:
    import paramiko

    key_path = Path(
        os.environ.get(
            "VM_SSH_PRIVATE_KEY_OPENSSH",
            str(ROOT / ".ssh-pulse-deploy" / "id_ed25519"),
        )
    )
    if not LOCAL.is_file():
        print(f"Missing {LOCAL}", file=sys.stderr)
        return 1
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.Ed25519Key.from_private_key_file(str(key_path))
    ssh.connect(VM_HOST, username=user, pkey=pkey, timeout=30)
    sftp = ssh.open_sftp()
    remote = f"{REMOTE_DIR}/data/news-channel-schedule.json"
    sftp.put(str(LOCAL), remote)
    sftp.close()
    cmd = (
        f"docker cp {remote} mycodao-app:/app/data/news-channel-schedule.json && "
        f"curl -sf http://127.0.0.1:3004/api/news/program | head -c 500"
    )
    _, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    print(stdout.read().decode(errors="replace"))
    err = stderr.read().decode(errors="replace")
    if err:
        print(err, file=sys.stderr)
    ssh.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
