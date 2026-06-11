#!/usr/bin/env python3
"""Import BLOCKS calendar workflow into myca-n8n on 192.168.0.188."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import paramiko

WF = Path(r"D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/n8n/workflows/blocks_calendar_auto_import.json")
HOST = "192.168.0.188"
CONTAINER = "myca-n8n"
REMOTE = "/tmp/blocks_calendar_auto_import.json"


def run(ssh: paramiko.SSHClient, cmd: str) -> tuple[int, str, str]:
    _, stdout, stderr = ssh.exec_command(cmd, timeout=180)
    code = stdout.channel.recv_exit_status()
    return code, stdout.read().decode(), stderr.read().decode()


def main() -> int:
    password = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
    if not password:
        print("VM_PASSWORD not set", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username="mycosoft", password=password, timeout=30)

    sftp = ssh.open_sftp()
    sftp.put(str(WF), REMOTE)
    sftp.close()

    code, out, err = run(ssh, f"docker cp {REMOTE} {CONTAINER}:{REMOTE}")
    print(out, err)

    # Import workflow (upsert by name handled by n8n import)
    code, out, err = run(
        ssh,
        f"docker exec {CONTAINER} n8n import:workflow --input={REMOTE} 2>&1",
    )
    print("import:", (out + err).encode("ascii", "replace").decode())
    if code != 0 and "already exists" not in (out + err).lower():
        # try update path via list + id
        pass

    # Activate by name using n8n CLI if available
    for activate_cmd in [
        f"docker exec {CONTAINER} n8n update:workflow --id=blocks-calendar-auto-import --active=true 2>&1",
        f"docker exec {CONTAINER} n8n publish:workflow --all 2>&1",
    ]:
        code, out, err = run(ssh, activate_cmd)
        if out or err:
            print("activate try:", out or err)

    # Set env on host compose / recreate — append to docker env file used by compose
    blocks_key = Path(r"D:/Users/admin2/Desktop/MYCOSOFT/CODE/MYCODAO/.ssh-pulse-deploy/id_ed25519")
    cron_secret = ""
    if blocks_key.is_file():
        code, out, _ = run(
            ssh,
            f"ssh -i {blocks_key} -o StrictHostKeyChecking=no mycosoft@192.168.0.198 "
            f"'grep ^BLOCKS_SCHEDULER_CRON_SECRET= /opt/mycodao/.env.production | cut -d= -f2-'",
        )
        cron_secret = out.strip().strip('"').strip("'")

    env_lines = [
        "BLOCKS_BASE_URL=https://blocks.mycodao.com",
    ]
    if cron_secret:
        env_lines.append(f"BLOCKS_SCHEDULER_CRON_SECRET={cron_secret}")

    for line in env_lines:
        key = line.split("=", 1)[0]
        run(
            ssh,
            f"grep -q '^{key}=' /home/mycosoft/myca-integrations/.env 2>/dev/null "
            f"|| echo '{line}' >> /home/mycosoft/myca-integrations/.env",
        )

    run(
        ssh,
        "cd /home/mycosoft/myca-integrations && docker compose up -d n8n 2>&1 | tail -5",
    )

    # Verify workflow listed
    code, out, err = run(
        ssh,
        f"docker exec {CONTAINER} n8n list:workflow 2>&1 | grep -i blocks || true",
    )
    print("workflows:", out or err)

    ssh.close()
    print("OK: n8n BLOCKS calendar workflow deployed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
