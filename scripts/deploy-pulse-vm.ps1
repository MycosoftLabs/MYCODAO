#Requires -Version 5.1
<#
  Deploy MycoDAO Pulse to the Proxmox guest (default 192.168.0.198).

  Auth (pick one):
  - OpenSSH private key: -PrivateKeyOpenSSH, $env:VM_SSH_PRIVATE_KEY_OPENSSH, or repo .ssh-pulse-deploy/id_ed25519
  - PuTTY .ppk: -PrivateKeyPpk or $env:VM_SSH_PRIVATE_KEY_PPK
  - Password: $env:VM_PASSWORD / VM_SSH_PASSWORD or MAS repo .credentials.local

  Usage (from repo root):
    .\scripts\deploy-pulse-vm.ps1
    .\scripts\deploy-pulse-vm.ps1 -PrivateKeyOpenSSH "$PWD\.ssh-pulse-deploy\id_ed25519"

  Requires: OpenSSH client (ssh) or PuTTY plink; LAN to VM; git + Docker on the VM.
  Set CLOUDFLARE_TUNNEL_TOKEN in /opt/mycodao/.env.production for tunnel profile.
#>
param(
  [string] $VmHost = "192.168.0.198",
  [string] $VmUser = "mycosoft",
  [string] $RemoteDir = "/opt/mycodao",
  [string] $Branch = "main",
  [string] $PrivateKeyOpenSSH = "",
  [string] $PrivateKeyPpk = "",
  [string] $HostKey = "ssh-ed25519 255 SHA256:bi3g/9ByDiGgwnHV9lrYdBOBVvB5yRv9i+/WbItR67s"
)

$ErrorActionPreference = "Stop"

function Get-VmPassword {
  if ($env:VM_PASSWORD) { return $env:VM_PASSWORD }
  if ($env:VM_SSH_PASSWORD) { return $env:VM_SSH_PASSWORD }
  $candidates = @(
    (Join-Path $PSScriptRoot "..\..\.credentials.local"),
    (Join-Path $PSScriptRoot "..\..\..\MAS\mycosoft-mas\.credentials.local"),
    (Join-Path $env:USERPROFILE ".mycosoft-credentials")
  )
  foreach ($p in $candidates) {
    if (-not (Test-Path $p)) { continue }
    Get-Content $p | ForEach-Object {
      if ($_ -match '^\s*VM_(?:SSH_)?PASSWORD\s*=\s*(.+)\s*$') { return $matches[1].Trim() }
    }
  }
  return $null
}

$openKey = $PrivateKeyOpenSSH
if (-not $openKey) { $openKey = $env:VM_SSH_PRIVATE_KEY_OPENSSH }
if (-not $openKey) {
  $def = Join-Path $PSScriptRoot "..\.ssh-pulse-deploy\id_ed25519"
  if (Test-Path $def) { $openKey = (Resolve-Path $def).Path }
}

$ppk = $PrivateKeyPpk
if (-not $ppk) { $ppk = $env:VM_SSH_PRIVATE_KEY_PPK }
if ($ppk -and -not (Test-Path $ppk)) {
  throw "Private key file not found: $ppk"
}
if ($openKey -and -not (Test-Path $openKey)) {
  throw "OpenSSH key not found: $openKey"
}

$pass = Get-VmPassword

$bash = @"
set -e
cd '$RemoteDir'
if [ ! -d .git ]; then echo 'Missing git repo at $RemoteDir — clone https://github.com/MycosoftLabs/MYCODAO.git first.'; exit 1; fi
git fetch origin
git checkout $Branch
git reset --hard origin/$Branch
if [ -f scripts/setup_blocks_nas_mount.sh ]; then
  export NAS_CIFS_URL='//192.168.0.105/mycosoft.com/MYCODAO/BLOCKS'
  export NAS_MOUNT_PATH='/mnt/nas/mycodao/BLOCKS'
  sudo -n -E bash scripts/setup_blocks_nas_mount.sh 2>/dev/null || echo 'NAS mount skipped (run apply_blocks_nas_production.py if needed)'
fi
if [ -f scripts/seed-blocks-producer-data.sh ]; then
  chmod +x scripts/seed-blocks-producer-data.sh
  MYCODAO_DATA_DIR='$RemoteDir/data' bash scripts/seed-blocks-producer-data.sh '$RemoteDir'
fi
docker compose build mycodao
docker compose up -d
docker compose --env-file .env.production --profile tunnel up -d
docker compose --env-file .env.production ps
"@
# OpenSSH on Windows passes CRLF to remote bash — normalize to LF
$bash = $bash -replace "`r`n", "`n"

Write-Host "Deploying to ${VmUser}@${VmHost}:${RemoteDir} (branch $Branch)..."

if ($openKey) {
  Write-Host "Using OpenSSH key: $openKey"
  $sshTarget = "${VmUser}@${VmHost}"
  & ssh.exe -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i $openKey $sshTarget $bash
  exit $LASTEXITCODE
}

$plink = Get-Command plink -ErrorAction SilentlyContinue
if (-not $plink) {
  throw "No OpenSSH key and plink.exe not found. Install PuTTY or use -PrivateKeyOpenSSH / .ssh-pulse-deploy/id_ed25519"
}

$plinkArgs = @("-batch", "-ssh", "${VmUser}@${VmHost}")
if ($HostKey) { $plinkArgs = @("-hostkey", $HostKey) + $plinkArgs }
if ($ppk) {
  $plinkArgs = @("-i", $ppk) + $plinkArgs
  Write-Host "Using PuTTY key: $ppk"
} else {
  if (-not $pass) {
    throw "No VM password and no OpenSSH/PuTTY key. See docs/PULSE_VM_CLOUDFLARE_TUNNEL_DEPLOY_APR14_2026.md"
  }
  $plinkArgs = $plinkArgs + @("-pw", $pass)
}

& plink.exe @plinkArgs $bash
Write-Host "Done. Test: https://blocks.mycodao.com/api/health and npm run test:blocks-smoke:prod"
