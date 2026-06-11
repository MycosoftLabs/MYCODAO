# Load MYCODAO secrets from .credentials.local (and MAS fallback) into process env.
# Used by start-blocks-dev.ps1 and configure-scheduler-lan-env.ps1.

function Import-BlocksCredentialFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name) {
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$masCreds = Join-Path (Join-Path (Join-Path $repoRoot "..") "MAS") "mycosoft-mas"
$masCreds = Join-Path $masCreds ".credentials.local"

foreach ($p in @(
        (Join-Path $repoRoot ".credentials.local"),
        $masCreds,
        (Join-Path $env:USERPROFILE ".mycosoft-credentials")
    )) {
    Import-BlocksCredentialFile ([System.IO.Path]::GetFullPath($p))
}
