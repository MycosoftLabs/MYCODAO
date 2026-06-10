#!/usr/bin/env bash
# Copy committed defaults into /app/data (or host ./data) when files are missing.
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
DATA="${MYCODAO_DATA_DIR:-$ROOT/data}"
SEED="$ROOT/config/blocks-producer"

mkdir -p "$DATA"

copy_seed_file() {
  local src="$1"
  local dest="$2"
  local label="$3"
  [[ -f "$src" ]] || { echo "seed: missing source $src" >&2; return 1; }
  if cp "$src" "$dest" 2>/dev/null; then
    echo "seed: $label $dest"
  elif sudo -n cp "$src" "$dest" 2>/dev/null; then
    sudo -n chown 1001:1001 "$dest" 2>/dev/null || sudo -n chown "$(whoami):$(whoami)" "$dest" 2>/dev/null || true
    echo "seed: $label $dest (sudo)"
  else
    echo "seed: skip $dest (permission denied; image uses config/blocks-producer fallback)" >&2
    return 1
  fi
}

# Presets are committed catalog data — always refresh from repo on deploy.
if [[ -f "$SEED/news-producer-presets.json" ]]; then
  copy_seed_file "$SEED/news-producer-presets.json" "$DATA/news-producer-presets.json" "sync presets →" || true
fi

# Runtime state + schedule: create only when missing (preserve on-air producer choices).
for f in news-channel-schedule.json news-producer-state.json; do
  dest="$DATA/$f"
  src="$SEED/$f"
  if [[ ! -f "$dest" && -f "$src" ]]; then
    copy_seed_file "$src" "$dest" "created" || true
  elif [[ -f "$dest" ]]; then
    echo "seed: keep existing $dest"
  fi
done
