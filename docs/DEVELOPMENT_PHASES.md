# Fitnexa Commercial Development Phases & Roadmap

This document outlines the structured progression of Fitnexa from foundation through full commercial enterprise readiness.

---

## Phase 0: Infrastructure Foundation & System Verification (Current Phase)
- [x] Monorepo workspace configuration (`pnpm`).
- [x] Shared isomorphic contracts package (`@fitnexa/shared`).
- [x] NestJS backend foundation with Helmet, Swagger, Global Filters, and Terminus health checks.
- [x] PostgreSQL 19/16 integration with Prisma ORM and connection health verification.
- [x] Redis and BullMQ infrastructure modules with retry and backoff strategies.
- [x] React + Vite + Tailwind CSS frontend shell adhering to strict Fitnexa Enterprise Design System.
- [x] Live system verification dashboard connected to real backend telemetry.
- [x] Docker Compose and Dockerfile specifications.
- [x] Complete architectural, security, and design documentation.

---

## Phase 1: Authentication, Multi-Tenancy & RBAC
- Enterprise gym tenant onboarding and branch configuration.
- Secure JWT authentication with HTTP-only refresh cookies.
- Server-side Role-Based Access Control (Super Admin, Gym Owner, Branch Manager, Trainer, Front Desk, Member).
- Audit trail recording and tenant context isolation.

---

## Phase 2: Member Management & Membership Plans
- Member profiles with photo capture, emergency contacts, medical history, and KYC records.
- Flexible membership tier engine (monthly, quarterly, annual, personal training packages).
- Subscription lifecycle state machine (active, expiring, expired, frozen, cancelled).

---

## Phase 3: Biometric Integration & Attendance Engine
- Integration with Indian commercial biometric hardware (eSSL, Realtime, ZKTeco via TCP/IP & HTTP push API).
- High-concurrency attendance check-in queue via BullMQ.
- Member access control gate (prevent check-in if membership is expired or frozen).
- Real-time attendance ledger and live floor count.

---

## Phase 4: Billing, Payments & Indian GST Compliance
- GST-compliant tax invoicing (CGST, SGST, IGST breakdown with HSN/SAC codes).
- Payment gateway integration (Razorpay / Cashfree) with webhook signature verification.
- Cash, UPI, and POS payment recording with printable PDF receipts.
- Automated payment reminder dispatch via SMS and WhatsApp.

---

## Phase 5: Trainer Management, Staff Payroll & Inventory
- Trainer assignment, commission tracking, and PT session logging.
- Staff shift scheduling and payroll calculation.
- Gym supplement and merchandise inventory tracking with low-stock alerts.

---

## Phase 6: Executive Analytics & Financial Reporting
- Real-time revenue dashboards, MRR/ARR tracking, and membership renewal forecasts.
- Attendance heatmaps and peak hour utilization analytics.
- Exportable GST GSTR-1 sales reports and audit dumps.

---

## Phase 7: Member Mobile PWA & Production Hardening
- Progressive Web App (PWA) for gym members (digital workout logs, QR check-in, fee renewal).
- Penetration testing, OWASP compliance verification, and multi-region disaster recovery testing.
