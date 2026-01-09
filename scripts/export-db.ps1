# Export Database Script for TechSonance POS
# This script reads DATABASE_URL from .env and runs pg_dump

# Get project root (parent of scripts folder)
$projectRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "Error: .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

# Read DATABASE_URL from .env
$databaseUrl = $null
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^DATABASE_URL\s*=\s*"?([^"]+)"?') {
        $databaseUrl = $matches[1]
    }
}

if (-not $databaseUrl) {
    Write-Host "Error: DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "Found DATABASE_URL" -ForegroundColor Green
Write-Host "Exporting database..." -ForegroundColor Yellow

$outputFile = Join-Path $projectRoot "db_dump.bak"

# Find pg_dump - check common locations
$pgDumpPath = $null
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\15\bin\pg_dump.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $pgDumpPath = $path
        break
    }
}

# Also check if pg_dump is in PATH
if (-not $pgDumpPath) {
    $pgDumpInPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($pgDumpInPath) {
        $pgDumpPath = $pgDumpInPath.Source
    }
}

if (-not $pgDumpPath) {
    Write-Host "`nError: pg_dump not found!" -ForegroundColor Red
    Write-Host "PostgreSQL client tools are not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "`nRun this command manually (replace with your pg_dump path):" -ForegroundColor Cyan
    Write-Host "`n`"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`" -Fc -v -d `"$databaseUrl`" -n public -f `"$outputFile`"" -ForegroundColor White
    exit 1
}

Write-Host "Using pg_dump: $pgDumpPath" -ForegroundColor Cyan

# Run pg_dump
& $pgDumpPath -Fc -v -d $databaseUrl -n public -f $outputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccess! Database exported to: $outputFile" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $outputFile).Length / 1KB) KB" -ForegroundColor Cyan
}
else {
    Write-Host "`nError: pg_dump failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
