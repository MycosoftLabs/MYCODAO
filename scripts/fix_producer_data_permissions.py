#!/usr/bin/env python3
"""Fix /app/data write permissions for nextjs user in mycodao-app container."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")
REMOTE_DIR = os.environ.get("MYCODAO_REMOTE_DIR", "/opt/mycodao")


def load_env_files() -> None:
    for env_path in (ROOT / ".env.local", ROOT / ".env.production"):
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def main() -> int:
    load_env_files()
    import paramiko

    key_path = Path(
        os.environ.get(
            "VM_SSH_PRIVATE_KEY_OPENSSH",
            str(ROOT / ".ssh-pulse-deploy" / "id_ed25519"),
        )
    )
    user = os.environ.get("VM_SSH_USER", "mycosoft")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = paramiko.Ed25519Key.from_private_key_file(str(key_path))
    ssh.connect(VM_HOST, username=user, pkey=pkey, timeout=30)

    # Host data dir owned by uid 1001 (nextjs) so volume mount stays writable
    host_cmds = [
        f"sudo chown -R 1001:65533 {REMOTE_DIR}/data 2>/dev/null || chown -R 1001:65533 {REMOTE_DIR}/data",
        f"chmod -R u+rwX,g+rwX {REMOTE_DIR}/data",
    ]
    for cmd in host_cmds:
        ssh.exec_command(cmd, timeout=60)

    container_cmds = [
        "docker exec -u 0 mycodao-app chown -R nextjs:nodejs /app/data",
        "docker exec -u 0 mycodao-app chmod -R u+rwX,g+rwX /app/data",
        "docker exec mycodao-app ls -la /app/data/news-producer-state.json",
    ]
    for cmd in container_cmds:
        _, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        out = stdout.read().decode(errors="replace")
        err = stderr.read().decode(errors="replace")
        if out.strip():
            print(out.strip())
        if err.strip():
            print(err.strip(), file=sys.stderr)

    producer_key = os.environ.get("NEWS_PRODUCER_API_KEY", "").strip()
    if producer_key:
        body = json.dumps(
            {
                "programOverride": {
                    "label": "Custom",
                    "type": "commercial",
                    "videoUrl": "https://youtu.be/lmLSTCr7C2Y",
                },
            },
        )
        test_cmd = (
            "curl -s -w '\\nHTTP:%{http_code}' "
            "-X PATCH http://127.0.0.1:3004/api/news/producer "
            "-H 'Content-Type: application/json' "
            f"-H 'x-news-producer-key: {producer_key}' "
            f"-d '{body}'"
        )
        _, stdout, _ = ssh.exec_command(test_cmd, timeout=30)
        print(stdout.read().decode(errors="replace")[-600:])

    ssh.close()
    print("Producer data permissions fixed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
