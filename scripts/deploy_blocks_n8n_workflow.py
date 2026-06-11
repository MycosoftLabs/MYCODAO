#!/usr/bin/env python3
"""Import and activate BLOCKS Calendar Auto-Import workflow on MAS n8n (188)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

MAS_REPO = Path(__file__).resolve().parents[2] / "MAS" / "mycosoft-mas"
if not (MAS_REPO / "n8n").is_dir():
    MAS_REPO = Path(r"D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas")
WF_PATH = MAS_REPO / "n8n" / "workflows" / "blocks_calendar_auto_import.json"
N8N_URL = os.environ.get("N8N_URL", "http://192.168.0.188:5678").rstrip("/")
API_KEY = os.environ.get("N8N_API_KEY", "")


def api(method: str, path: str, body: dict | None = None) -> dict:
    headers = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{N8N_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise SystemExit(f"n8n API {method} {path} -> {e.code}: {err}") from e


def main() -> int:
    if not API_KEY:
        print("Set N8N_API_KEY", file=sys.stderr)
        return 1
    if not WF_PATH.is_file():
        print(f"Missing workflow: {WF_PATH}", file=sys.stderr)
        return 1

    wf = json.loads(WF_PATH.read_text(encoding="utf-8"))
    name = wf.get("name", "BLOCKS Calendar Auto-Import")

    existing = api("GET", "/api/v1/workflows?limit=250")
    workflows = existing.get("data", existing if isinstance(existing, list) else [])
    match = next((w for w in workflows if w.get("name") == name), None)

    payload = {k: v for k, v in wf.items() if k not in ("id", "createdAt", "updatedAt")}
    payload["name"] = name

    if match:
        wf_id = match["id"]
        api("PUT", f"/api/v1/workflows/{wf_id}", payload)
        print(f"Updated workflow id={wf_id}")
    else:
        created = api("POST", "/api/v1/workflows", payload)
        wf_id = created.get("id") or created.get("data", {}).get("id")
        print(f"Created workflow id={wf_id}")

    api("POST", f"/api/v1/workflows/{wf_id}/activate", {})
    print(f"Activated: {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
