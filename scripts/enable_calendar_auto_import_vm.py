#!/usr/bin/env python3
"""Enable calendar auto-import on VM 198 data + env (no secret output)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SSH_KEY = REPO / ".ssh-pulse-deploy" / "id_ed25519"
VM = "mycosoft@192.168.0.198"

PATCH = ""  # legacy; use scp script in patch_schedule_on_vm


def ssh(cmd: str) -> str:
    return subprocess.check_output(
        [
            "ssh",
            "-i",
            str(SSH_KEY),
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=accept-new",
            VM,
            cmd,
        ],
        text=True,
    ).strip()


def patch_schedule_on_vm() -> None:
    check = ssh(
        "docker exec mycodao-green python3 -c "
        "\"import json; s=json.load(open('/app/data/news-channel-schedule.json')); "
        "print(s.get('integrations',{}).get('googleCalendar',{}).get('autoImportEnabled'))\""
    )
    if check.strip().lower() == "true":
        print("autoImportEnabled already true (container data)")
        return

    remote_script = "/tmp/enable_blocks_auto_import.py"
    local_script = REPO / "scripts" / ".enable_auto_import.py"
    local_script.write_text(
        """import json
p = "/app/data/news-channel-schedule.json"
with open(p, encoding="utf-8") as f:
    s = json.load(f)
s.setdefault("integrations", {})
s["integrations"].setdefault("googleCalendar", {})
s["integrations"]["googleCalendar"]["autoImportEnabled"] = True
s["integrations"]["googleCalendar"]["enabled"] = True
with open(p, "w", encoding="utf-8") as f:
    json.dump(s, f, indent=2)
    f.write("\\n")
print("autoImportEnabled=true")
""",
        encoding="utf-8",
    )
    subprocess.run(
        [
            "scp",
            "-i",
            str(SSH_KEY),
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=accept-new",
            str(local_script),
            f"{VM}:{remote_script}",
        ],
        check=True,
    )
    print(ssh(f"docker cp {remote_script} mycodao-green:/tmp/enable_blocks_auto_import.py && "
              f"docker exec mycodao-green python3 /tmp/enable_blocks_auto_import.py && rm -f {remote_script}"))


def main() -> int:
    if not SSH_KEY.is_file():
        print(f"Missing SSH key: {SSH_KEY}", file=sys.stderr)
        return 1
    patch_schedule_on_vm()
    # Ensure env fallback for new containers
    ssh(
        "grep -q '^BLOCKS_CALENDAR_AUTO_IMPORT=' /opt/mycodao/.env.production 2>/dev/null "
        "|| echo 'BLOCKS_CALENDAR_AUTO_IMPORT=1' >> /opt/mycodao/.env.production"
    )
    print("OK: auto-import enabled on VM schedule data")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
