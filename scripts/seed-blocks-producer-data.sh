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
    cp "$src" "$dest"
    echo "seed: created $dest"
  elif [[ -f "$dest" ]]; then
    echo "seed: keep existing $dest"
  else
    echo "seed: missing source $src" >&2
  fi
done
