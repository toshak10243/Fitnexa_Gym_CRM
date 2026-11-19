# Fitnexa Automated Setup Verification Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "FITNEXA LOCAL ENVIRONMENT & HEALTH VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Node.js
Write-Host "`n[1/5] Checking Node.js runtime..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "  -> Node.js Version: $nodeVersion" -ForegroundColor Green

# 2. Check pnpm
Write-Host "`n[2/5] Checking pnpm package manager..." -ForegroundColor Yellow
$pnpmVersion = pnpm.cmd -v
Write-Host "  -> pnpm Version: $pnpmVersion" -ForegroundColor Green

# 3. Check PostgreSQL
Write-Host "`n[3/5] Checking PostgreSQL service and connectivity..." -ForegroundColor Yellow
$pgService = Get-Service *postgres* -ErrorAction SilentlyContinue
if ($pgService) {
  Write-Host "  -> PostgreSQL Service: $($pgService.Name) ($($pgService.Status))" -ForegroundColor Green
} else {
  Write-Host "  -> PostgreSQL Service not detected as Windows Service" -ForegroundColor Red
}

# 4. Check API Health
Write-Host "`n[4/5] Checking API Server Health Endpoint (http://localhost:3000/api/v1/health)..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method Get -TimeoutSec 5
  Write-Host "  -> API Status: $($health.status)" -ForegroundColor Green
  Write-Host "  -> Database: $($health.services.database.status) ($($health.services.database.responseTimeMs) ms)" -ForegroundColor Green
  Write-Host "  -> Redis: $($health.services.redis.status)" -ForegroundColor $(if ($health.services.redis.status -eq 'up') { 'Green' } else { 'Yellow' })
} catch {
  Write-Host "  -> API Server is not currently reachable on port 3000 (Start with: pnpm run dev:api)" -ForegroundColor DarkGray
}

# 5. Check Frontend
Write-Host "`n[5/5] Checking Frontend Server (http://localhost:5173)..." -ForegroundColor Yellow
try {
  $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -TimeoutSec 5 -UseBasicParsing
  Write-Host "  -> Frontend Status: $($frontend.StatusCode) OK" -ForegroundColor Green
} catch {
  Write-Host "  -> Frontend Dev Server is not currently reachable on port 5173 (Start with: pnpm run dev:web)" -ForegroundColor DarkGray
}

Write-Host "`nVerification check complete.`n" -ForegroundColor Cyan
