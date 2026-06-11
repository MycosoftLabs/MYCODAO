#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
REPO = Path(__file__).resolve().parents[1]
KEY = REPO / ".ssh-pulse-deploy" / "id_ed25519"
COMPOSE = "/home/mycosoft/myca-integrations/docker-compose.yml"


def cron_secret() -> str:
    return subprocess.check_output(
        [
            "ssh",
            "-i",
            str(KEY),
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=no",
            "mycosoft@192.168.0.198",
            "grep ^BLOCKS_SCHEDULER_CRON_SECRET= /opt/mycodao/.env.production | cut -d= -f2-",
        ],
        text=True,
    ).strip().strip('"').strip("'")


PATCH_PY = r'''
import pathlib
p = pathlib.Path("{compose}")
text = p.read_text()
for key in ("BLOCKS_BASE_URL", "BLOCKS_SCHEDULER_CRON_SECRET"):
    lines = [ln for ln in text.splitlines() if not ln.strip().startswith(key + ":")]
    text = "\n".join(lines)
needle = "      N8N_METRICS: \"true\""
insert = needle + "\n      BLOCKS_BASE_URL: https://blocks.mycodao.com\n      BLOCKS_SCHEDULER_CRON_SECRET: {secret}"
if needle not in text:
    raise SystemExit("needle not found")
text = text.replace(needle, insert, 1)
p.write_text(text + ("\n" if not text.endswith("\n") else ""))
print("patched")
'''


def run(ssh, cmd):
    _, o, e = ssh.exec_command(cmd, timeout=180)
    code = o.channel.recv_exit_status()
    return code, (o.read() + e.read()).decode("utf-8", "replace")


def main() -> int:
    secret = cron_secret()
    if not secret:
        print("no secret", file=sys.stderr)
        return 1
    pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.0.188", username="mycosoft", password=pw, timeout=30)

    remote = "/tmp/patch_n8n_compose.py"
    script = PATCH_PY.format(compose=COMPOSE, secret=secret.replace("\\", "\\\\").replace('"', '\\"'))
    sftp = ssh.open_sftp()
    with sftp.file(remote, "w") as f:
        f.write(script)
    sftp.close()

    code, out = run(ssh, f"python3 {remote}")
    print(out)
    if code != 0:
        return code

    code, out = run(ssh, f"grep BLOCKS {COMPOSE} | sed 's/:.*/: ***/'")
    print(out)

    code, out = run(
        ssh,
        "cd /home/mycosoft/myca-integrations && docker compose up -d --force-recreate n8n",
    )
    print(out)

    code, out = run(ssh, "docker exec myca-n8n printenv BLOCKS_BASE_URL")
    ok = bool(out.strip())
    code, out2 = run(ssh, "docker exec myca-n8n printenv BLOCKS_SCHEDULER_CRON_SECRET")
    ok = ok and bool(out2.strip())
    print("env configured:", ok)

    run(ssh, "docker exec myca-n8n n8n import:workflow --input=/tmp/blocks_calendar_auto_import.json 2>/dev/null || true")
    run(ssh, "docker exec myca-n8n n8n update:workflow --id=blocks-calendar-auto-import --active=true")
    ssh.close()
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
