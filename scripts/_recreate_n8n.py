#!/usr/bin/env python3
import os, paramiko, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.0.188", username="mycosoft", password=pw, timeout=30)
cmds = [
    "docker stop myca-n8n || true",
    "docker rm myca-n8n || true",
    "cd /home/mycosoft/myca-integrations && docker compose up -d n8n",
    "docker exec myca-n8n printenv BLOCKS_BASE_URL",
    "docker exec myca-n8n sh -c 'test -n \"$BLOCKS_SCHEDULER_CRON_SECRET\" && echo secret=set || echo secret=missing'",
    "docker cp /tmp/blocks_calendar_auto_import.json myca-n8n:/tmp/blocks_calendar_auto_import.json",
    "docker exec myca-n8n n8n import:workflow --input=/tmp/blocks_calendar_auto_import.json",
    "docker exec myca-n8n n8n update:workflow --id=blocks-calendar-auto-import --active=true",
]
for c in cmds:
    _, o, e = ssh.exec_command(c, timeout=180)
    o.channel.recv_exit_status()
    print(">", c)
    print((o.read() + e.read()).decode("utf-8", "replace")[:800])
ssh.close()
