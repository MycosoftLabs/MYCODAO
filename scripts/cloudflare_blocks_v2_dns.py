"""Point blocks-v2.mycodao.com at the mycodao-blocks ALB (proxied, SSL Full). Does not change `blocks`.

Reads CLOUDFLARE_API_TOKEN from the environment (website .credentials.local). Usage:
  python scripts/cloudflare_blocks_v2_dns.py <alb-dns-name>
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request

API = "https://api.cloudflare.com/client/v4"
ZONE_NAME = "mycodao.com"
HOST = "blocks-v2.mycodao.com"


def cf(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"{API}{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        out = json.loads(res.read())
    if not out.get("success"):
        raise RuntimeError(json.dumps(out.get("errors")))
    return out


def main() -> None:
    alb = sys.argv[1]
    zone = cf("GET", f"/zones?name={ZONE_NAME}")["result"][0]["id"]
    existing = cf("GET", f"/zones/{zone}/dns_records?name={HOST}")["result"]
    record = {"type": "CNAME", "name": HOST, "content": alb, "proxied": True, "ttl": 1, "comment": "Blocks v2 preview (separate ECS service)"}
    if existing:
        cf("PUT", f"/zones/{zone}/dns_records/{existing[0]['id']}", record)
        print(f"updated CNAME {HOST} -> {alb}")
    else:
        cf("POST", f"/zones/{zone}/dns_records", record)
        print(f"created CNAME {HOST} -> {alb}")

    # SSL mode Full for this hostname (ALB serves :443 with the blocks ACM cert; Full does not require a name match).
    phase = "http_config_settings"
    try:
        ruleset = cf("GET", f"/zones/{zone}/rulesets/phases/{phase}/entrypoint")["result"]
        rules = ruleset.get("rules", [])
    except RuntimeError:
        rules = []
    if any(HOST in r.get("expression", "") for r in rules):
        print("SSL Full rule already covers blocks-v2")
        return
    keep = [{k: r[k] for k in ("ref", "action", "action_parameters", "expression", "description", "enabled") if k in r} for r in rules]
    keep.append({
        "action": "set_config", "action_parameters": {"ssl": "full"},
        "expression": f'(http.host eq "{HOST}")', "description": "blocks-v2-alb-full", "enabled": True,
    })
    cf("PUT", f"/zones/{zone}/rulesets/phases/{phase}/entrypoint", {"rules": keep})
    print("added SSL Full rule for blocks-v2")


if __name__ == "__main__":
    main()
