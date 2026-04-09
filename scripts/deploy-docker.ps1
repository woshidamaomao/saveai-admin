$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$EnvFile = Join-Path $Root ".env"
$ArgsList = @("compose")
if (Test-Path $EnvFile) {
  $ArgsList += @("--env-file", $EnvFile)
}
$ArgsList += @("-f", "docker-compose.yml")
if ($env:ADMIN_USE_TRAEFIK -eq "1") {
  $ArgsList += @("-f", "docker-compose.traefik.yml")
}
$ArgsList += @("up", "-d", "--build")
$ArgsList += $args

& docker @ArgsList
