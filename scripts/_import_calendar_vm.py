#!/usr/bin/env python3
# AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
"""Run Google Calendar → schedule slot import on VM 198 (uses cron secret)."""
from __future__ import annotations

if __name__ == "__main__":
    raise SystemExit('Retired on-prem utility: use the AWS release/SSM procedure in AWS_INFRA_REFERENCE.md; no local production servers exist.')


import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SSH_KEY = REPO / ".ssh-pulse-deploy" / "id_ed25519"
VM = "mycosoft@192.168.0.198"
BASE = "https://blocks.mycodao.com"


def ssh(cmd: str) -> str:
    out = subprocess.check_output(
        [
            "ssh",
            "-i",
            str(SSH_KEY),
            "-o",
            "StrictHostKeyChecking=no",
            VM,
            cmd,
        ],
        text=True,
    )
    return out.strip()


def main() -> None:
    secret = ""
    for line in ssh("grep '^BLOCKS_SCHEDULER_CRON_SECRET=' /opt/mycodao/.env.production").splitlines():
        if line.startswith("BLOCKS_SCHEDULER_CRON_SECRET="):
            secret = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
    if not secret:
        raise SystemExit("BLOCKS_SCHEDULER_CRON_SECRET not found on VM")

    subprocess.run(
        [sys.executable, str(REPO / "scripts" / "enable_calendar_auto_import_vm.py")],
        check=True,
    )

    req = urllib.request.Request(
        f"{BASE}/api/news/producer/integrations/calendar/cron",
        headers={"x-blocks-cron-secret": secret},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(body, file=sys.stderr)
        raise SystemExit(e.code) from e

    print(body)
    data = json.loads(body)
    if not data.get("ok"):
        raise SystemExit(f"import failed: {data}")


if __name__ == "__main__":
    main()
