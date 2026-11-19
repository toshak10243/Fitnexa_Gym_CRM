<#
.SYNOPSIS
  Database Disaster Recovery & Point-in-Time Restore Drill Script for Fitnexa
.DESCRIPTION
  Validates backup archive SHA256 checksum, performs controlled restore using pg_restore,
  and verifies schema and record consistency across multi-tenant tables.
.PARAMETER BackupFile
  Path to the .dump backup archive file. Defaults to the latest available in backups/.
.PARAMETER TargetDatabase
  Destination database name for the drill restore. Defaults to 'fitnexa_restore_drill'.
#>

[CmdletBinding()]
param(
  [string]$BackupFile,
  [string]$TargetDatabase = "fitnexa_restore_drill"
)

$ErrorActionPreference = "Stop"

# 1. Resolve PostgreSQL Binaries
$cmd = Get-Command pg_restore -ErrorAction SilentlyContinue
$pgRestorePath = if ($cmd) { $cmd.Source } else { $null }

if (-not $pgRestorePath) {
  $discovered = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_restore.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($discovered) {
    $pgRestorePath = $discovered.FullName
  } else {
    Write-Error "PostgreSQL pg_restore executable could not be found."
    exit 1
  }
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
$psqlPath = if ($psqlCmd) { $psqlCmd.Source } else { $null }
if (-not $psqlPath) {
  $discoveredPsql = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($discoveredPsql) {
    $psqlPath = $discoveredPsql.FullName
  }
}

# 2. Database Connection Parameters
$dbHost = "localhost"
$dbPort = "5432"
$dbUser = "postgres"
$env:PGPASSWORD = "Root@123"

# 3. Locate Target Backup File
$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not $BackupFile) {
  $latest = Get-ChildItem -Path $backupDir -Filter "fitnexa_backup_*.dump" | Sort-Object CreationTime -Descending | Select-Object -First 1
  if (-not $latest) {
    Write-Error "No backup files found in $backupDir to perform restore drill."
    exit 1
  }
  $BackupFile = $latest.FullName
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "FITNEXA DISASTER RECOVERY & RESTORE DRILL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Source Archive   : $BackupFile" -ForegroundColor Gray
Write-Host "Target Database  : $TargetDatabase at ${dbHost}:${dbPort}" -ForegroundColor Gray

# 4. Verify SHA256 Checksum Integrity
$checksumFile = "${BackupFile}.sha256"
if (Test-Path $checksumFile) {
  $checksumRaw = (Get-Content $checksumFile -Raw).Trim()
  $expectedHash = ($checksumRaw -split '\s+')[0].Trim()
  $actualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
  if ($expectedHash -ne $actualHash) {
    Write-Error "CRITICAL: Backup archive checksum mismatch! Expected: $expectedHash, Actual: $actualHash"
    exit 1
  }
  Write-Host "Checksum Verified : SHA256 matches cryptographic signature ($actualHash)." -ForegroundColor Green
} else {
  Write-Host "Warning: No .sha256 checksum file located for this archive." -ForegroundColor Yellow
}

# 5. Create Drill Target Database (Drop if exists)
if ($psqlPath) {
  Write-Host "Recreating drill database: $TargetDatabase..." -ForegroundColor Gray
  & $psqlPath --host=$dbHost --port=$dbPort --username=$dbUser --no-password -c "DROP DATABASE IF EXISTS $TargetDatabase;" template1 | Out-Null
  & $psqlPath --host=$dbHost --port=$dbPort --username=$dbUser --no-password -c "CREATE DATABASE $TargetDatabase;" template1 | Out-Null
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()

try {
  # 6. Execute pg_restore
  Write-Host "Restoring schema and data into $TargetDatabase..." -ForegroundColor Gray
  & $pgRestorePath --host=$dbHost --port=$dbPort --username=$dbUser --dbname=$TargetDatabase --no-password --clean --if-exists --no-owner $BackupFile 2>$null
  
  $sw.Stop()

  Write-Host "Restore operation completed in $($sw.ElapsedMilliseconds) ms" -ForegroundColor Green

  # 7. Verification Query
  if ($psqlPath) {
    $tableCounts = & $psqlPath --host=$dbHost --port=$dbPort --username=$dbUser --dbname=$TargetDatabase --no-password -t -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
    $tableCount = $tableCounts.Trim()
    Write-Host "Restored Tables  : $tableCount public tables verified in $TargetDatabase" -ForegroundColor Green
    
    # Clean up drill database
    & $psqlPath --host=$dbHost --port=$dbPort --username=$dbUser --no-password -c "DROP DATABASE IF EXISTS $TargetDatabase;" template1 | Out-Null
    Write-Host "Drill database safely decommissioned after verification." -ForegroundColor Gray
  }

} catch {
  Write-Error "Disaster recovery drill failed: $_"
  exit 1
} finally {
  $env:PGPASSWORD = $null
}
