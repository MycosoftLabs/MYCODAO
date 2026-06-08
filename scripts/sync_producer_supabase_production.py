#!/usr/bin/env python3
"""Merge Supabase public keys into VM 198 /opt/mycodao/.env.production for producer auth."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import paramiko

REPO = Path(__file__).resolve().parents[1]
VM_HOST = os.environ.get("MYCODAO_VM_HOST", "192.168.0.198")
VM_USER = os.environ.get("VM_SSH_USER", "mycosoft")
REMOTE_ENV = "/opt/mycodao/.env.production"

KEYS = (
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
)


def load_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def load_credentials() -> str:
    for base in (
        REPO / ".credentials.local",
        REPO.parent / "MAS" / "mycosoft-mas" / ".credentials.local",
        Path.home() / ".mycosoft-credentials",
    ):
        env = load_dotenv(base)
        pw = env.get("VM_PASSWORD") or env.get("VM_SSH_PASSWORD")
        if pw:
            return pw
    pw = os.environ.get("VM_PASSWORD") or os.environ.get("VM_SSH_PASSWORD")
    if not pw:
        raise SystemExit("VM_PASSWORD not found in .credentials.local or env")
    return pw


def resolve_supabase() -> dict[str, str]:
    local = load_dotenv(REPO / ".env.local")
    website = load_dotenv(REPO.parent / "WEBSITE" / "website" / ".env.local")
    merged = {**website, **local}
    url = merged.get("NEXT_PUBLIC_SUPABASE_URL") or merged.get("SUPABASE_URL", "")
    anon = merged.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or merged.get("SUPABASE_ANON_KEY", "")
    if not url or not anon:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")
    return {
        "NEXT_PUBLIC_SUPABASE_URL": url,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
        "SUPABASE_URL": url,
        "SUPABASE_ANON_KEY": anon,
    }


def patch_env_text(text: str, values: dict[str, str]) -> str:
    lines = text.splitlines()
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        m = re.match(r"^([A-Z0-9_]+)=", line)
        if m and m.group(1) in values:
            key = m.group(1)
            out.append(f"{key}={values[key]}")
            seen.add(key)
        else:
            out.append(line)
    missing = [k for k in values if k not in seen]
    if missing:
        if out and out[-1].strip():
            out.append("")
        out.append("# Supabase producer auth (sync_producer_supabase_production.py)")
        for key in missing:
            out.append(f"{key}={values[key]}")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    values = resolve_supabase()
    password = load_credentials()
    key_path = REPO / ".ssh-pulse-deploy" / "id_ed25519"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    if key_path.is_file():
        ssh.connect(VM_HOST, username=VM_USER, key_filename=str(key_path), timeout=30)
    else:
        ssh.connect(VM_HOST, username=VM_USER, password=password, timeout=30)

    sftp = ssh.open_sftp()
    try:
        with sftp.open(REMOTE_ENV, "r") as f:
            current = f.read().decode("utf-8", errors="replace")
    except FileNotFoundError:
        current = ""

    patched = patch_env_text(current, values)
    with sftp.open(REMOTE_ENV, "w") as f:
        f.write(patched)

    print(f"Updated {REMOTE_ENV} on {VM_HOST} with Supabase public keys.")
    ssh.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
