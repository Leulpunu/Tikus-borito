param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_DB_URL) {
  throw "Set SUPABASE_DB_URL to the direct Postgres connection string before running this script."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump is not installed. Install PostgreSQL client tools and try again."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedOutput = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedOutput "tikus-borito-$timestamp.dump"

& $pgDump.Source --format=custom --no-owner --no-acl --file=$backupPath $env:SUPABASE_DB_URL
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE."
}

Write-Host "Database backup created: $backupPath"
