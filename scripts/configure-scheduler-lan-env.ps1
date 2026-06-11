# Configure BLOCKS scheduler LAN env: Streamlabs Remote API + Google Calendar + cron secrets.
# Writes scheduler block to .env.local; secrets live in .credentials.local (gitignored).

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

. (Join-Path $PSScriptRoot "load-blocks-credentials.ps1")

function Get-LanIPv4 {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -like "192.168.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
    return "192.168.0.241"
}

$lanIp = Get-LanIPv4
$credsPath = Join-Path $repo ".credentials.local"
$envLocalPath = Join-Path $repo ".env.local"

if (-not (Test-Path $credsPath)) {
    $template = @(
        "# MYCODAO BLOCKS secrets - never commit. Loaded by scripts/load-blocks-credentials.ps1"
        "# Streamlabs Desktop: Settings -> Remote Control -> copy token"
        "STREAMLABS_REMOTE_TOKEN="
        ""
        "# Google Calendar: Settings -> Integrate calendar -> Secret address in iCal format"
        "GOOGLE_CALENDAR_ICAL_URL="
        "# Or calendar ID / email (public calendar)"
        "GOOGLE_CALENDAR_ID="
        ""
        "# NAS (optional; MAS .credentials.local may also supply NAS_SMB_PASSWORD)"
        "NAS_SMB_PASSWORD="
    ) -join "`r`n"
    Set-Content -Path $credsPath -Value $template -Encoding utf8
    Write-Host "Created $credsPath - add STREAMLABS_REMOTE_TOKEN and GOOGLE_CALENDAR_ICAL_URL"
}

. (Join-Path $PSScriptRoot "load-blocks-credentials.ps1")

$streamlabsUrl = "http://${lanIp}:59650/api"
$blocksBase = "http://${lanIp}:3004"
$cronSecret = $env:BLOCKS_SCHEDULER_CRON_SECRET
if (-not $cronSecret) { $cronSecret = $env:NEWS_PRODUCER_API_KEY }
if (-not $cronSecret) { $cronSecret = "blocks-scheduler-dev" }

$feedToken = $env:BLOCKS_CALENDAR_FEED_TOKEN
if (-not $feedToken) { $feedToken = "blocks-feed-$lanIp-dev" }

$schedulerLines = @(
    ""
    "# --- BLOCKS Scheduler integrations (LAN dev, Jun 2026) ---"
    "# Streamlabs: enable Remote Control on streaming PC; token in .credentials.local"
    "STREAMLABS_REMOTE_API_URL=$streamlabsUrl"
    "STREAMLABS_REMOTE_TOKEN=$($env:STREAMLABS_REMOTE_TOKEN)"
    "GOOGLE_CALENDAR_ICAL_URL=$($env:GOOGLE_CALENDAR_ICAL_URL)"
    "GOOGLE_CALENDAR_ID=$($env:GOOGLE_CALENDAR_ID)"
    "BLOCKS_PUBLIC_BASE_URL=$blocksBase"
    "NEXT_PUBLIC_BLOCKS_BASE_URL=$blocksBase"
    "BLOCKS_SCHEDULER_CRON_SECRET=$cronSecret"
    "BLOCKS_CALENDAR_FEED_TOKEN=$feedToken"
    "BLOCKS_CALENDAR_AUTO_IMPORT=0"
)
$schedulerBlock = ($schedulerLines -join "`r`n").TrimEnd()

$existing = if (Test-Path $envLocalPath) { Get-Content $envLocalPath -Raw } else { "" }
if ($existing -match "# --- BLOCKS Scheduler integrations") {
    $existing = [regex]::Replace(
        $existing,
        "(?s)# --- BLOCKS Scheduler integrations.*?(?=\r?\n# ---|\z)",
        $schedulerBlock
    )
} else {
    $existing = $existing.TrimEnd() + "`r`n" + $schedulerBlock
}
Set-Content -Path $envLocalPath -Value $existing.TrimEnd() -Encoding utf8

Write-Host "LAN IP: $lanIp"
Write-Host "Streamlabs API: $streamlabsUrl"
Write-Host "BLOCKS base: $blocksBase"
if (-not $env:STREAMLABS_REMOTE_TOKEN) {
    Write-Host "WARN STREAMLABS_REMOTE_TOKEN empty - paste in .credentials.local then re-run"
}
if (-not $env:GOOGLE_CALENDAR_ICAL_URL -and -not $env:GOOGLE_CALENDAR_ID) {
    Write-Host "WARN Google Calendar not set - paste GOOGLE_CALENDAR_ICAL_URL in .credentials.local then re-run"
}
Write-Host "Updated $envLocalPath scheduler block"
