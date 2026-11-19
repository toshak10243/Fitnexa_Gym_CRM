# FITNEXA: PROJECT RULES & ARCHITECTURAL INVARIANTS

This document governs engineering practices, code quality standards, and system security controls for the Fitnexa CRM / ERP platform.

---

## 1. Architectural Invariants

1. **Modular Monolith Integrity**:
   - The system is built as a single deployable backend with strictly delineated module boundaries (`modules/auth`, `modules/members`, `modules/attendance`, etc.).
   - Cross-module communication must happen via exported services or asynchronous event queues (BullMQ), never through direct database manipulation of another module's internal tables.

2. **Monorepo Structure**:
   - Root workspace uses `pnpm`.
   - `packages/shared`: Sole source of truth for isomorphic contracts, DTO interfaces, error schemas, and shared constants.
   - `apps/api`: NestJS backend.
   - `apps/web`: React + Vite frontend.

3. **Database & Schema Governance**:
   - Schema modifications must be performed via version-controlled Prisma migrations.
   - Never execute destructive operations (`migrate reset`, `db push --force-reset`, `DROP TABLE`) on production or staging environments.
   - Tenant isolation must be designed into every entity (`tenantId`).

4. **Redis & Background Jobs**:
   - Redis must remain inaccessible from the public internet (bind to localhost or internal Docker network).
   - Redis must not be used as the sole protection against database race conditions; use PostgreSQL row locks (`SELECT FOR UPDATE`) or transactional boundaries for critical financial mutations.
   - BullMQ jobs must define explicit retry limits and exponential backoff.

---

## 2. Security Controls Checklist

- [x] Enable PostgreSQL RLS where applicable.
- [x] Authenticate every protected API route with JWT validation.
- [x] Authorize actions server-side based on tenant and role.
- [x] Never trust frontend state or claims.
- [x] Prevent Insecure Direct Object References (IDOR).
- [x] Validate and sanitize all user input via `class-validator` and `zod`.
- [x] Use parameterized database queries exclusively.
- [x] Implement distributed rate limiting via Redis.
- [x] Restrict CORS to explicit allowed origins with no wildcards in production.
- [x] Enforce HTTPS in production with HSTS headers.
- [x] Configure Helmet security headers (CSP, frameguard, noSniff).
- [x] Disable debug modes and verbose error stack traces in production.
- [x] Record administrator and user audit activities.
- [x] Keep file storage private; validate MIME types and upload size limits.
- [x] Keep dependencies updated and monitor for vulnerabilities.
- [x] Apply least-privilege database user credentials (`fitnexa_app`).

---

## 3. Code Standards & Quality Gates

1. **TypeScript Strict Mode**:
   - Both backend and frontend must compile under `strict: true`.
   - No `any` types permitted in domain logic or API contracts.
2. **Quality Gates**:
   - Every commit must pass `pnpm run typecheck`, `pnpm run lint`, and unit tests.
3. **Indian Commercial Compliance**:
   - Currency representation must default to INR (₹) with Paisa decimal accuracy.
   - Invoicing must support CGST / SGST / IGST breakdown.
   - Timestamps must support `Asia/Kolkata` time zone presentation.
