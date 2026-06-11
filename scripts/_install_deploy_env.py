#!/usr/bin/env python3
"""Install /opt/mycodao/deploy.env on VM 198 with Cloudflare purge credentials."""
from __future__ import annotations

import subprocess
import textwrap
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
WEBSITE_CREDS = Path(r"D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.credentials.local")
SSH_KEY = REPO / ".ssh-pulse-deploy" / "id_ed25519"
VM = "mycosoft@192.168.0.198"
REMOTE = "/opt/mycodao/deploy.env"


def load_creds(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def main() -> None:
    creds = load_creds(WEBSITE_CREDS)
    zone = creds.get("CLOUDFLARE_ZONE_ID") or creds.get("CLOUDFLARE_ZONE_ID_PRODUCTION")
    token = creds.get("CLOUDFLARE_API_TOKEN")
    if not zone or not token:
        raise SystemExit("Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN")

    content = textwrap.dedent(
        f"""\
        # MycoDAO BLOCKS deploy secrets (not in git).
        CF_ZONE_ID={zone}
        CF_API_TOKEN={token}
        CLOUDFLARE_ZONE_ID={zone}
        CLOUDFLARE_API_TOKEN={token}
        PUBLIC_HOST=blocks.mycodao.com
        """
    )

    tmp = REPO / "scripts" / ".deploy_env_tmp"
    tmp.write_text(content, encoding="utf-8", newline="\n")
    verify_bytes = (
        b"#!/usr/bin/env bash\n"
        b"set -a\n"
        b"source /opt/mycodao/deploy.env\n"
        b"set +a\n"
        b'curl -m 20 -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" '
        b'-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" '
        b"-d '{\"purge_everything\":true}'\n"
    )
    verify = REPO / "scripts" / ".cf_purge_verify.sh"
    verify.write_bytes(verify_bytes)
    try:
        subprocess.run(
            [
                "scp",
                "-i",
                str(SSH_KEY),
                "-o",
                "StrictHostKeyChecking=no",
                str(tmp),
                f"{VM}:{REMOTE}",
            ],
            check=True,
        )
        subprocess.run(
            [
                "ssh",
                "-i",
                str(SSH_KEY),
                "-o",
                "StrictHostKeyChecking=no",
                VM,
                f"chmod 600 {REMOTE} && wc -c {REMOTE}",
            ],
            check=True,
        )
        try:
            subprocess.run(
                [
                    "scp",
                    "-i",
                    str(SSH_KEY),
                    "-o",
                    "StrictHostKeyChecking=no",
                    str(verify),
                    f"{VM}:/tmp/cf_purge_verify.sh",
                ],
                check=True,
            )
            subprocess.run(
                [
                    "ssh",
                    "-i",
                    str(SSH_KEY),
                    "-o",
                    "StrictHostKeyChecking=no",
                    VM,
                    "bash /tmp/cf_purge_verify.sh && rm -f /tmp/cf_purge_verify.sh",
                ],
                check=True,
            )
        finally:
            verify.unlink(missing_ok=True)
    finally:
        tmp.unlink(missing_ok=True)

    print("OK: deploy.env installed on VM; Cloudflare purge verified from VM")


if __name__ == "__main__":
    main()
