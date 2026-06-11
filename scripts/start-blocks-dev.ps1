# Start BLOCKS dev stack on port 3004 (pulse bundle + Next.js).
# Run from MYCODAO repo root or anywhere.

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

. (Join-Path $PSScriptRoot "load-blocks-credentials.ps1")
if (-not (Select-String -Path (Join-Path $repo ".env.local") -Pattern "BLOCKS Scheduler integrations" -Quiet -ErrorAction SilentlyContinue)) {
  & (Join-Path $PSScriptRoot "configure-scheduler-lan-env.ps1")
}

Write-Host "Freeing port 3004..."
Get-NetTCPConnection -LocalPort 3004 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Write-Host "Building pulse bundle..."
npm run build:pulse
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$logDir = Join-Path $repo "data"
$logFile = Join-Path $logDir "blocks-dev-server.log"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "Starting Next.js on http://localhost:3004 (external, logs: data/blocks-dev-server.log)..."
$startCmd = @"
Set-Location '$repo'
Add-Content -Path '$logFile' -Value ('--- restart ' + (Get-Date -Format o) + ' ---') -Encoding utf8
npm run dev *>&1 | ForEach-Object { `$_; Add-Content -Path '$logFile' -Value `$_ -Encoding utf8 }
"@
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  $startCmd
)

$deadline = (Get-Date).AddSeconds(45)
do {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3004/api/health" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) {
      Write-Host "OK   Dev server ready: http://localhost:3004/blocks/#producer"
      exit 0
    }
  } catch {
    # retry
  }
} while ((Get-Date) -lt $deadline)

Write-Host "WARN Dev server did not respond on :3004 within 45s - check hidden PowerShell window."
exit 1
