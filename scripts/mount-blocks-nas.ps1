# Mount UniFi NAS share for BLOCKS producer media (Windows dev).
# Loads NAS_SMB_* from MYCODAO or MAS .credentials.local — never commit passwords.
param(
    [switch]$Disconnect
)

$ErrorActionPreference = "Stop"

function Load-CredentialsFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name) { Set-Item -Path "env:$name" -Value $value }
        }
    }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$masCreds = Join-Path (Join-Path (Join-Path $repoRoot "..") "MAS") "mycosoft-mas"
$masCreds = Join-Path $masCreds ".credentials.local"
$credPaths = @(
    (Join-Path $repoRoot ".credentials.local"),
    $masCreds,
    (Join-Path $env:USERPROFILE ".mycosoft-credentials")
)

foreach ($p in $credPaths) {
    $resolved = [System.IO.Path]::GetFullPath($p)
    Load-CredentialsFile $resolved
}

$hostIp = if ($env:NAS_HOST) { $env:NAS_HOST.Trim() } else { "192.168.0.105" }
# BLOCKS lives on the dedicated MYCODAO share (not mycosoft.com\MYCODAO).
$shareRoot = "\\$hostIp\MYCODAO"
$blocksPath = "$shareRoot\BLOCKS"
$user = if ($env:NAS_SMB_USER) { $env:NAS_SMB_USER.Trim() } else { "mycosoft" }
$pass = $env:NAS_SMB_PASSWORD

if ($Disconnect) {
    Write-Host "Disconnecting $shareRoot ..."
    net use $shareRoot /delete /y 2>$null | Out-Null
    exit 0
}

if (Test-Path $blocksPath) {
    Write-Host "OK: BLOCKS NAS already reachable at $blocksPath"
    exit 0
}

if (-not $pass) {
    Write-Host "ERROR: NAS_SMB_PASSWORD not set. Add to MYCODAO/.credentials.local or MAS/.credentials.local"
    Write-Host "  NAS_SMB_USER=mycosoft"
    Write-Host "  NAS_SMB_PASSWORD=<from UniFi NAS>"
    exit 1
}

Write-Host "Mounting $shareRoot as $user ..."
$netArgs = @("use", $shareRoot, "/user:$user", $pass, "/persistent:yes")
$out = & net.exe @netArgs 2>&1
$code = $LASTEXITCODE

if ($code -ne 0 -and ($out -join " ") -notmatch "already|Multiple connections") {
    Write-Host "net use failed ($code): $out"
    exit $code
}

Start-Sleep -Milliseconds 500

if (Test-Path $blocksPath) {
    Write-Host "OK: BLOCKS NAS mounted at $blocksPath"
    Get-ChildItem $blocksPath -ErrorAction SilentlyContinue | Select-Object -First 5 Name
    exit 0
}

Write-Host "ERROR: Share mounted but BLOCKS path missing: $blocksPath"
Write-Host "Create MYCODAO/BLOCKS on the NAS (commercials, shows, live-streams, graphics, bumpers)."
exit 2
