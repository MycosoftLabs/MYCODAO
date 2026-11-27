# AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.

if __name__ == "__main__":
    raise SystemExit('Retired on-prem utility: use the AWS release/SSM procedure in AWS_INFRA_REFERENCE.md; no local production servers exist.')

import os, paramiko, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.0.188", username="mycosoft", password=pw, timeout=30)
for cmd in [
    "docker exec myca-n8n n8n update:workflow --id=blocks-calendar-auto-import --active=true",
    "docker exec myca-n8n n8n export:workflow --id=blocks-calendar-auto-import --output=/tmp/blocks-export.json && docker exec myca-n8n cat /tmp/blocks-export.json | head -c 200",
]:
    _, o, e = ssh.exec_command(cmd)
    o.channel.recv_exit_status()
    print((o.read()+e.read()).decode('utf-8','replace'))
ssh.close()
