#!/usr/bin/env python3
"""Copy GOOGLE_CALENDAR_ICAL_URL from prod VM to local .env.local (never prints secret)."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
ENV_LOCAL = ROOT / ".env.local"
HOST = os.environ.get("BLOCKS_VM_HOST", "192.168.0.198")
USER = os.environ.get("VM_SSH_USER", "mycosoft")
PASSWORD = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD", "")


def load_creds() -> None:
    creds = ROOT / ".credentials.local"
    if not creds.exists():
        return
    for line in creds.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def fetch_prod_ical_url() -> str | None:
    if not PASSWORD:
        print("error: VM_PASSWORD not set", file=sys.stderr)
        return None
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    try:
        for path in ("/opt/mycodao/.env.local", "/opt/mycodao/.env"):
            _, stdout, _ = ssh.exec_command(f"grep -E '^GOOGLE_CALENDAR_ICAL_URL=' {path} 2>/dev/null | head -1")
            line = stdout.read().decode().strip()
            if line and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
        _, stdout, _ = ssh.exec_command(
            "python3 -c \"import json; d=json.load(open('/opt/mycodao/data/news-channel-schedule.json')); print(d.get('integrations',{}).get('googleCalendar',{}).get('icalUrl',''))\""
        )
        url = stdout.read().decode().strip()
        return url or None
    finally:
        ssh.close()


def upsert_env_local(key: str, value: str) -> None:
    lines: list[str] = []
    if ENV_LOCAL.exists():
        lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines()
    pattern = re.compile(rf"^{re.escape(key)}=")
    replaced = False
    out: list[str] = []
    for line in lines:
        if pattern.match(line):
            out.append(f"{key}={value}")
            replaced = True
        else:
            out.append(line)
    if not replaced:
        if out and out[-1].strip():
            out.append("")
        out.append(f"{key}={value}")
    ENV_LOCAL.write_text("\n".join(out) + "\n", encoding="utf-8")


def upsert_schedule_ical_url(url: str) -> None:
    schedule_path = ROOT / "data" / "news-channel-schedule.json"
    if not schedule_path.exists():
        return
    import json

    data = json.loads(schedule_path.read_text(encoding="utf-8"))
    integrations = data.setdefault("integrations", {})
    gcal = integrations.setdefault("googleCalendar", {})
    gcal["icalUrl"] = url
    gcal["enabled"] = gcal.get("enabled", True)
    gcal.pop("lastSyncError", None)
    schedule_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    load_creds()
    url = fetch_prod_ical_url()
    if not url or not url.startswith("http"):
        print("error: prod GOOGLE_CALENDAR_ICAL_URL not found", file=sys.stderr)
        return 1
    upsert_env_local("GOOGLE_CALENDAR_ICAL_URL", url)
    upsert_schedule_ical_url(url)
    print("ok: GOOGLE_CALENDAR_ICAL_URL copied to .env.local (secret not printed)")
    print("next: restart npm run dev on 3004, then Sync from Google in Producer")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
