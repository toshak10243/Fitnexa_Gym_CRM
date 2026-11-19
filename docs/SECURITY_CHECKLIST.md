# Fitnexa Enterprise Security Checklist

This document details the security posture, controls, and compliance benchmarks implemented across the Fitnexa platform.

---

## 1. Identity & Access Management (IAM)
- [x] Passwords hashed with bcrypt (minimum cost factor 12) or Argon2id.
- [x] JWT access tokens strictly scoped with short lifetimes (15m to 1h); refresh tokens stored securely in HTTP-only, secure, SameSite cookies.
- [x] Role-Based Access Control (RBAC) enforced server-side via NestJS guards.
- [x] Multi-tenancy isolation validated on every request (`tenantId` checked against the authenticated user's claim).
- [x] Insecure Direct Object References (IDOR) prevented by scoping all Prisma queries with `tenantId` and `branchId`.

---

## 2. Network & Transport Security
- [x] HTTPS enforced in production with HTTP Strict Transport Security (HSTS) headers: `max-age=31536000; includeSubDomains; preload`.
- [x] Restrictive CORS configured via environment variables; wildcard origins (`*`) strictly disallowed in production.
- [x] Security headers enforced via `helmet`:
  - Content Security Policy (CSP)
  - X-Frame-Options: DENY (anti-clickjacking)
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin

---

## 3. Data Protection & Cryptography
- [x] All database interactions use Prisma parameterized queries to eliminate SQL injection.
- [x] Sensitive user data (phone numbers, personal identification, biometric templates) encrypted at rest where required.
- [x] Least-privilege database user credentials (`fitnexa_app`) configured for application runtimes.
- [x] Database superuser credentials strictly forbidden for application runtime queries.
- [x] Application secrets managed through secure environment variables (`.env`), never committed to source control.

---

## 4. Rate Limiting & Denial of Service (DoS) Defense
- [x] Global request body size limits enforced (10MB for JSON and urlencoded payloads).
- [x] Distributed rate limiting via Redis token bucket algorithm to protect public endpoints (login, forgot password, OTP requests) against brute force attacks.
- [x] NestJS request timeout guards to prevent slowloris attacks.

---

## 5. Audit Logging & Non-Repudiation
- [x] Structured HTTP request logging with correlation IDs (`x-correlation-id`).
- [x] Dedicated audit trail ledger for critical administrator actions (membership cancellations, refund issuance, staff role elevations, biometric device manual overrides).
- [x] Error responses follow RFC 7807; database schemas, table names, and stack traces are suppressed in production.
