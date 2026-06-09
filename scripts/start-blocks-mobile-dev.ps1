# BLOCKS mobile LAN testing — built SPA on Next :3004 (best for Chrome Android).

# Usage: .\scripts\start-blocks-mobile-dev.ps1

$ErrorActionPreference = "Stop"

$repo = Split-Path $PSScriptRoot -Parent

$lanIp = (

  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |

    Where-Object { $_.IPAddress -match '^192\.168\.\d+\.\d+$' -and $_.PrefixOrigin -eq 'Dhcp' } |

    Select-Object -First 1 -ExpandProperty IPAddress

)

if (-not $lanIp) { $lanIp = "127.0.0.1" }



function Ensure-FirewallRule {

  param([string]$Name, [int]$Port)

  $existing = netsh advfirewall firewall show rule name="$Name" 2>$null

  if ($LASTEXITCODE -ne 0) {

    netsh advfirewall firewall add rule name="$Name" dir=in action=allow protocol=TCP localport=$Port profile=private | Out-Null

    Write-Host "Firewall: allowed inbound TCP $Port (private)"

  }

}



Ensure-FirewallRule -Name "MYCODAO Blocks Mobile 3004" -Port 3004

Ensure-FirewallRule -Name "MYCODAO Blocks Vite 3000" -Port 3000



Write-Host "Building myco-pulse -> public/blocks ..."

Push-Location (Join-Path $repo "myco-pulse")

npm run build | Out-Host

Pop-Location



$nextPid = (Get-NetTCPConnection -LocalPort 3004 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess

if ($nextPid) {

  Write-Host "Next already on :3004 (PID $nextPid). Restart Next if you changed next.config.mjs."

} else {

  Write-Host "Starting Next on 0.0.0.0:3004 ..."

  Start-Process powershell -WindowStyle Hidden -ArgumentList @(

    "-NoProfile", "-NoExit", "-Command",

    "Set-Location '$repo'; npm run dev"

  )

  Start-Sleep -Seconds 4

}



Write-Host ""

Write-Host "=== Chrome on Android (same Wi-Fi as this PC) ==="

Write-Host "Open exactly:  http://${lanIp}:3004/blocks"

Write-Host "Do NOT use :3000 on the phone (Vite dev is too heavy on mobile)."

Write-Host "First load may take 15-30s while ~2MB JS downloads — you should see 'Loading broadcast…' not a blank white page."

Write-Host 'If it fails: Chrome menu - Site settings - clear data for that URL, or try Incognito.'

Write-Host ""

Write-Host "Desktop:       http://localhost:3004/blocks"

Write-Host "Vite hot reload (desktop only): http://localhost:3000/blocks/"


