# Fitnexa — Enterprise Gym Management CRM / ERP

Fitnexa is a production-grade Gym Management CRM / ERP built specifically for commercial Indian gym businesses, regional fitness chains, and independent gym proprietors.

---

## Architecture Overview

```
fitnexa/
|-- apps/
|   |-- web/          # React 18 + TypeScript + Vite + Tailwind CSS + TanStack
|   |-- api/          # NestJS 11 + TypeScript + Prisma + Redis + BullMQ
|-- packages/
|   |-- shared/       # Shared TypeScript contracts, DTOs, and constants
|-- infrastructure/   # Multi-stage Dockerfiles and SQL init scripts
|-- docs/             # Enterprise architectural and security documentation
|-- docker-compose.yml
|-- pnpm-workspace.yaml
```

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, TanStack Table, React Hook Form, Zod, Axios, Radix UI Primitives, Recharts.
- **Backend**: NestJS, TypeScript, REST APIs, Swagger / OpenAPI, Class Validator, Class Transformer, Helmet, Compression, Winston / Nest Logger.
- **Database**: PostgreSQL 19/16, Prisma ORM, Database Migrations, Connection Pooling.
- **Cache & Queues**: Redis, BullMQ Background Processing, Token-Bucket Rate Limiting.
- **DevOps**: Docker, Docker Compose, pnpm workspaces, ESLint, Prettier, GitHub Actions.

---

## Local Development Quickstart

### Prerequisites
- Node.js `22.x` or `24.x`
- `pnpm` (`npm install -g pnpm`)
- PostgreSQL running locally (port 5432) or via Docker

### 1. Install Dependencies
```powershell
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Ensure `DATABASE_URL` matches your local PostgreSQL credentials (default: `postgresql://postgres:Root@123@localhost:5432/fitnexa_dev?schema=public`).

### 3. Generate Prisma Client & Migrate
```powershell
pnpm run prisma:generate
pnpm run prisma:migrate
```

### 4. Start Development Servers
In separate terminals:
```powershell
# Start NestJS Backend (Port 3000)
pnpm run dev:api

# Start React Frontend (Port 5173)
pnpm run dev:web
```

### 5. Access Dashboards
- **Web Console**: [http://localhost:5173](http://localhost:5173)
- **API Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Health Telemetry Endpoint**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## Verification & Quality Gates

Run all quality checks across the monorepo:
```powershell
# Typecheck
pnpm run typecheck

# Lint
pnpm run lint

# Automated Unit Tests
pnpm run test

# Production Build
pnpm run build
```

---

## License & Intellectual Property
Commercial enterprise software. All rights reserved.
