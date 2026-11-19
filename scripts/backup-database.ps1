<#
.SYNOPSIS
  Automated PostgreSQL Backup Script for Fitnexa Gym Management CRM/ERP
.DESCRIPTION
  Performs an enterprise-grade, compressed custom-format pg_dump of the Fitnexa
  database, generates SHA256 integrity checksums, maintains an immutable JSONL
  audit ledger of backups, and enforces backup retention policies.
.PARAMETER RetentionDays
  Number of days to retain old backup files before automated pruning. Default is 30.
#>

[CmdletBinding()]
param(
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

# 1. Resolve PostgreSQL Binaries
$cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgDumpPath = if ($cmd) { $cmd.Source } else { $null }

if (-not $pgDumpPath) {
  $discovered = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($discovered) {
    $pgDumpPath = $discovered.FullName
  } else {
    Write-Error "PostgreSQL pg_dump executable could not be found in PATH or standard installation directories."
    exit 1
  }
}

# 2. Database Connection Parameters
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "fitnexa_dev"
$dbUser = "postgres"
$env:PGPASSWORD = "Root@123"

# 3. Create Backup Directory
$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "fitnexa_backup_${timestamp}.dump"
$backupFilePath = Join-Path $backupDir $backupFileName
$checksumFilePath = "${backupFilePath}.sha256"
$logFilePath = Join-Path $backupDir "backup_log.jsonl"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "FITNEXA DATABASE BACKUP DRILL - [${timestamp}]" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Database : ${dbName} at ${dbHost}:${dbPort}" -ForegroundColor Gray
Write-Host "Destination     : ${backupFilePath}" -ForegroundColor Gray

$sw = [System.Diagnostics.Stopwatch]::StartNew()

try {
  # 4. Execute pg_dump with custom compressed archive format (-Fc)
  & $pgDumpPath --host=$dbHost --port=$dbPort --username=$dbUser --format=c --file=$backupFilePath --no-password $dbName
  
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump process terminated with non-zero exit code: $LASTEXITCODE"
  }

  $sw.Stop()
  $fileSize = (Get-Item $backupFilePath).Length

  # 5. Compute SHA256 Checksum
  $hashResult = Get-FileHash -Path $backupFilePath -Algorithm SHA256
  "$($hashResult.Hash) *$backupFileName" | Out-File -FilePath $checksumFilePath -Encoding utf8

  # 6. Append to Backup Audit Ledger
  $logEntry = [PSCustomObject]@{
    timestamp        = (Get-Date).ToString("o")
    backupFile       = $backupFileName
    fileSizeBytes    = $fileSize
    fileSizeFormatted= "$([math]::Round($fileSize / 1MB, 2)) MB"
    durationMs       = $sw.ElapsedMilliseconds
    sha256           = $hashResult.Hash
    database         = $dbName
    status           = "SUCCESS"
  }
  ($logEntry | ConvertTo-Json -Compress) | Out-File -FilePath $logFilePath -Append -Encoding utf8

  Write-Host "Backup completed successfully in $($sw.ElapsedMilliseconds) ms" -ForegroundColor Green
  Write-Host "File Size       : $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor Green
  Write-Host "SHA256 Checksum : $($hashResult.Hash)" -ForegroundColor Green

  # 7. Retention Pruning
  $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
  $prunedFiles = Get-ChildItem -Path $backupDir -Filter "fitnexa_backup_*.dump*" | Where-Object { $_.CreationTime -lt $cutoffDate }
  foreach ($oldFile in $prunedFiles) {
    Remove-Item -Path $oldFile.FullName -Force
    Write-Host "Pruned aged backup file: $($oldFile.Name)" -ForegroundColor Yellow
  }

} catch {
  Write-Error "Database backup failed: $_"
  exit 1
} finally {
  $env:PGPASSWORD = $null
}
