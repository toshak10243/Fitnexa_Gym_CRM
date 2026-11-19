# Fitnexa Local Development Setup & Troubleshooting Guide

This guide provides instructions for setting up, running, and verifying the Fitnexa monorepo on a local Windows development machine.

---

## 1. Prerequisites
- **Node.js**: `v22.x` or `v24.x` (verified with `v24.19.0`)
- **pnpm**: `v12.x` (`npm install -g pnpm`)
- **PostgreSQL**: PostgreSQL 19 or 16 installed locally or running via Docker.
- **Git**: Installed and available in PATH.

---

## 2. Step-by-Step Initialization

### Step 1: Install Dependencies
From the repository root:
```powershell
pnpm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Ensure the `DATABASE_URL` matches your local PostgreSQL settings:
```
DATABASE_URL=postgresql://postgres:Root@123@localhost:5432/fitnexa_dev?schema=public
```

### Step 3: Run Database Migrations
```powershell
pnpm run prisma:generate
pnpm run prisma:migrate
```

---

## 3. Running Development Services

### Backend (NestJS on Port 3000)
```powershell
pnpm run dev:api
```
- API Base: `http://localhost:3000/api/v1`
- Swagger Documentation: `http://localhost:3000/api/docs`
- Health Endpoint: `http://localhost:3000/api/v1/health`

### Frontend (React + Vite on Port 5173)
```powershell
pnpm run dev:web
```
- Web Application: `http://localhost:5173`

---

## 4. Quality Verification & Testing

### Typecheck all packages
```powershell
pnpm run typecheck
```

### Run unit tests
```powershell
pnpm run test
```

### Verify production builds
```powershell
pnpm run build
```

---

## 5. Troubleshooting

### Issue: PostgreSQL Connection Refused on Port 5432
1. Verify the PostgreSQL Windows Service is running:
   ```powershell
   Get-Service *postgres*
   ```
2. If stopped, start the service:
   ```powershell
   Start-Service postgresql-x64-19
   ```

### Issue: Redis Offline / Degraded
- In local development, the backend operates in degraded mode if Redis is not running; all non-cached operations and database queries proceed without crashing.
- To install Redis on Windows:
  - Option A: Install via Chocolatey: `choco install redis`
  - Option B: Run via Docker: `docker-compose up -d redis`
  - Option C: Use WSL2: `sudo apt install redis-server && sudo service redis-server start`
