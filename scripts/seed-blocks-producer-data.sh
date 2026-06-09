#!/usr/bin/env bash
# Copy committed defaults into /app/data (or host ./data) when files are missing.
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
DATA="${MYCODAO_DATA_DIR:-$ROOT/data}"
SEED="$ROOT/config/blocks-producer"

mkdir -p "$DATA"

for f in news-producer-presets.json news-channel-schedule.json news-producer-state.json; do
  dest="$DATA/$f"
  src="$SEED/$f"
  if [[ ! -f "$dest" && -f "$src" ]]; then
    if cp "$src" "$dest" 2>/dev/null; then
      echo "seed: created $dest"
    elif sudo -n cp "$src" "$dest" 2>/dev/null; then
      sudo -n chown "$(whoami):$(whoami)" "$dest" 2>/dev/null || true
      echo "seed: created $dest (sudo)"
    else
      echo "seed: skip $dest (permission denied; image uses config/blocks-producer fallback)"
    fi
  elif [[ -f "$dest" ]]; then
    echo "seed: keep existing $dest"
  else
    echo "seed: missing source $src" >&2
  fi
done
