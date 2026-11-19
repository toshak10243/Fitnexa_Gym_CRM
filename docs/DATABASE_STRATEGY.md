# Fitnexa Database Architecture & Strategy

## 1. Relational Foundation: PostgreSQL 19 / 16 + Prisma ORM
PostgreSQL serves as the primary relational database for Fitnexa. It guarantees ACID properties required for financial transactions (GST invoices, subscription fees, payment gateway reconciliations) and member access records.

---

## 2. Multi-Tenancy & Row Level Security (RLS) Strategy

Fitnexa employs a **shared database, shared schema with Row Level Security (RLS)** architecture for multi-tenancy:

1. **Tenant Identification**: Every entity (gym, member, plan, invoice, attendance log) contains a non-nullable `tenantId` UUID column.
2. **PostgreSQL RLS Policies**:
   ```sql
   -- Example RLS Policy for future phases
   ALTER TABLE members ENABLE ROW LEVEL SECURITY;

   CREATE POLICY tenant_isolation_policy ON members
     AS RESTRICTIVE
     USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
   ```
3. **Prisma Client Middleware**:
   In multi-tenant operations, Prisma Client extensions automatically inject the tenant context into the PostgreSQL session via `SET LOCAL app.current_tenant_id = '...'` before query execution.

---

## 3. Least-Privilege Role Security
Application runtime queries never use database superuser privileges:
- **`postgres` (Superuser)**: Restricted strictly to database creation, extensions, and schema migrations.
- **`fitnexa_app` (Application Role)**: Standard user granted DML permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on `public` schema tables. It cannot execute `DROP TABLE`, `ALTER TABLE`, or create database roles.

---

## 4. Migration & Schema Governance
1. Migrations are strictly generated using `prisma migrate dev --name <migration_name>`.
2. Every migration is version-controlled in `apps/api/prisma/migrations`.
3. Destructive database commands (`prisma migrate reset`, `DROP DATABASE`) are strictly prohibited in production and staging environments without multi-party operational approval.
4. Foreign key indices and compound indexes are mandatory on high-frequency filters (`[tenantId, branchId]`, `[tenantId, memberId]`).

---

## 5. Connection Management & Pooling
- Development uses direct TCP connections to `localhost:5432`.
- Production leverages connection pooling via PgBouncer or AWS RDS Proxy with transaction-mode pooling to handle high-concurrency biometric attendance spikes.
