#!/usr/bin/env python3
"""Post-deploy verification for BLOCKS + n8n + MINDEX."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KEY = r"D:/Users/admin2/Desktop/MYCOSOFT/CODE/MYCODAO/.ssh-pulse-deploy/id_ed25519"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'} {name}" + (f" — {detail}" if detail else ""))


def get(url: str, headers: dict | None = None) -> tuple[int, str, dict]:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode()[:300], dict(r.headers)


def main() -> int:
    try:
        code, _, hdrs = get("https://blocks.mycodao.com/healthz")
        check("blocks healthz", code == 200, f"slot={hdrs.get('X-Active-Slot', '?')}")
    except Exception as e:
        check("blocks healthz", False, str(e))

    try:
        code, _, _ = get("https://blocks.mycodao.com/api/news/epg")
        check("blocks epg", code == 200)
    except Exception as e:
        check("blocks epg", False, str(e))

    try:
        code, _, _ = get("http://192.168.0.189:8000/health")
        check("mindex api", code == 200)
    except Exception as e:
        check("mindex api", False, str(e))

    try:
        code, _, _ = get("http://192.168.0.188:5678/healthz")
        check("n8n health", code == 200)
    except Exception as e:
        check("n8n health", False, str(e))

    secret = subprocess.check_output(
        [
            "ssh", "-i", KEY, "-o", "BatchMode=yes", "mycosoft@192.168.0.198",
            "grep ^BLOCKS_SCHEDULER_CRON_SECRET= /opt/mycodao/.env.production | cut -d= -f2-",
        ],
        text=True,
    ).strip()
    try:
        code, body, _ = get(
            "https://blocks.mycodao.com/api/news/producer/integrations/calendar/cron",
            {"x-blocks-cron-secret": secret},
        )
        data = json.loads(body)
        check("calendar cron", code == 200 and data.get("ok"), f"slots={data.get('totalSlots')}")
    except Exception as e:
        check("calendar cron", False, str(e))

    pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")
    if pw:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect("192.168.0.188", username="mycosoft", password=pw, timeout=30)
        _, o, _ = ssh.exec_command("docker exec myca-n8n n8n list:workflow 2>&1 | grep -i BLOCKS")
        line = o.read().decode("utf-8", "replace").strip()
        _, o2, _ = ssh.exec_command("docker exec myca-n8n printenv BLOCKS_BASE_URL")
        base = o2.read().decode().strip()
        ssh.close()
        check("n8n blocks workflow", "BLOCKS Calendar" in line, line[:80])
        check("n8n BLOCKS_BASE_URL", base == "https://blocks.mycodao.com", base or "missing")
    else:
        check("n8n ssh checks", False, "VM_PASSWORD not set")

    failed = [n for n, ok, _ in results if not ok]
    print(f"\nSummary: {len(results) - len(failed)}/{len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
