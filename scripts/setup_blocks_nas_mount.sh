#!/usr/bin/env bash
# AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
# Mount UniFi NAS BLOCKS producer media on MycoDAO VM (198).
# Share: //192.168.0.105/MYCODAO  subfolder: BLOCKS
# Same SMB credentials as MINDEX library.

set -euo pipefail

NAS_SHARE="${BLOCKS_NAS_SHARE:-//192.168.0.105/MYCODAO}"
SHARE_MOUNT="${BLOCKS_NAS_SHARE_MOUNT:-/mnt/nas/MYCODAO}"
MOUNT_POINT="${NAS_MOUNT_PATH:-/mnt/nas/mycodao/BLOCKS}"
CREDS_FILE="${NAS_CREDS_FILE:-/etc/samba/blocks-nascreds}"

echo "=== BLOCKS NAS mount (MycoDAO producer) ==="
echo "Share:       $NAS_SHARE"
echo "Share mount: $SHARE_MOUNT"
echo "App path:    $MOUNT_POINT (BLOCKS subfolder)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq cifs-utils keyutils smbclient
ldconfig
modprobe cifs 2>/dev/null || true

USE_CREDS="$CREDS_FILE"
if [[ -f "$CREDS_FILE" ]] && [[ -z "${NAS_SMB_PASSWORD:-}" ]]; then
  echo "Using credentials: $CREDS_FILE"
elif [[ -f /etc/samba/mindex-nascreds ]] && [[ -z "${NAS_SMB_PASSWORD:-}" ]]; then
  USE_CREDS="/etc/samba/mindex-nascreds"
elif [[ -f /etc/samba/mycosoft-nas.creds ]] && [[ -z "${NAS_SMB_PASSWORD:-}" ]]; then
  USE_CREDS="/etc/samba/mycosoft-nas.creds"
elif [[ -n "${NAS_SMB_PASSWORD:-}" ]]; then
  mkdir -p "$(dirname "$CREDS_FILE")"
  cat > "$CREDS_FILE" <<EOF
username=${NAS_SMB_USER:-mycosoft}
password=${NAS_SMB_PASSWORD}
domain=WORKGROUP
EOF
  chmod 600 "$CREDS_FILE"
  USE_CREDS="$CREDS_FILE"
else
  echo "Set NAS_SMB_PASSWORD or create creds under /etc/samba/" >&2
  exit 1
fi

MNT_OPTS="credentials=$USE_CREDS,uid=1001,gid=1001,iocharset=utf8,file_mode=0644,dir_mode=0755,vers=3.0"

is_cifs_mount() {
  local dest="$1"
  mountpoint -q "$dest" 2>/dev/null || return 1
  local fstype
  fstype=$(findmnt -n -o FSTYPE "$dest" || true)
  [[ "$fstype" == "cifs" || "$fstype" == "smb3" ]]
}

try_mount_share() {
  local url="$1"
  local dest="$2"
  mkdir -p "$dest"
  if is_cifs_mount "$dest"; then
    echo "Already mounted (cifs) at $dest"
    return 0
  fi
  if mountpoint -q "$dest" 2>/dev/null; then
    echo "Unmounting non-CIFS mount at $dest"
    umount "$dest" 2>/dev/null || true
  fi
  echo "Mounting $url -> $dest"
  if mount -t cifs "$url" "$dest" -o "$MNT_OPTS"; then
    return 0
  fi
  if mount -t cifs "$url" "$dest" -o "${MNT_OPTS},vers=2.1"; then
    return 0
  fi
  return 1
}

# Remove stale local-only dirs that masquerade as a successful mount
if [[ -d "$MOUNT_POINT" ]] && ! is_cifs_mount "$MOUNT_POINT"; then
  if [[ ! -L "$MOUNT_POINT" ]]; then
    if [[ -z "$(find "$MOUNT_POINT" -mindepth 1 -maxdepth 2 -type f 2>/dev/null | head -1)" ]]; then
      echo "Removing empty local mount stub: $MOUNT_POINT"
      rm -rf "$MOUNT_POINT"
    fi
  fi
fi

MOUNT_URLS=(
  "$NAS_SHARE"
  "//192.168.0.105/MYCODAO"
  "//192.168.0.105/mycosoft.com"
)

mounted=false
for url in "${MOUNT_URLS[@]}"; do
  if try_mount_share "$url" "$SHARE_MOUNT"; then
    mounted=true
    break
  fi
done

if [[ "$mounted" != "true" ]] || ! is_cifs_mount "$SHARE_MOUNT"; then
  echo "CIFS mount failed for all share URLs" >&2
  exit 1
fi

BLOCKS_SUB=""
for sub in BLOCKS blocks; do
  if [[ -d "$SHARE_MOUNT/$sub" ]]; then
    BLOCKS_SUB="$SHARE_MOUNT/$sub"
    break
  fi
done

if [[ -z "$BLOCKS_SUB" ]]; then
  echo "BLOCKS folder not found under $SHARE_MOUNT" >&2
  ls -la "$SHARE_MOUNT" >&2
  exit 1
fi

mkdir -p "$(dirname "$MOUNT_POINT")"
if [[ "$BLOCKS_SUB" != "$MOUNT_POINT" ]]; then
  rm -rf "$MOUNT_POINT" 2>/dev/null || true
  ln -sfn "$BLOCKS_SUB" "$MOUNT_POINT"
fi

if ! is_cifs_mount "$SHARE_MOUNT"; then
  echo "Post-link verification failed: share is not CIFS" >&2
  exit 1
fi

if ! grep -qF "$SHARE_MOUNT" /etc/fstab 2>/dev/null; then
  echo "$NAS_SHARE $SHARE_MOUNT cifs $MNT_OPTS,nofail,x-systemd.automount 0 0" >> /etc/fstab
  echo "Added fstab entry for $SHARE_MOUNT"
fi

for dir in commercials shows live-streams graphics bumpers; do
  mkdir -p "$MOUNT_POINT/$dir" 2>/dev/null || true
done

df -h "$SHARE_MOUNT"
findmnt "$SHARE_MOUNT"
ls -la "$MOUNT_POINT"
echo "=== BLOCKS NAS mount OK (cifs verified) ==="
