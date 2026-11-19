# Fitnexa System Architecture

## 1. Architectural Philosophy: Clean Modular Monolith
Fitnexa is engineered as a **Modular Monolith**. While microservices introduce significant operational overhead, distributed transaction complexities, and high infrastructure costs, a properly architected modular monolith provides high velocity, zero network hop latency between domain contexts, and straightforward ACID database transactions, while retaining clean boundaries that can be split into microservices if needed.

```
+-------------------------------------------------------------------+
|                           Fitnexa Web                             |
|       (React 18 + Vite + Tailwind CSS + TanStack Query/Table)     |
+---------------------------------+---------------------------------+
                                  | HTTP / REST (JSON)
                                  v
+-------------------------------------------------------------------+
|                        API Gateway Layer                          |
|             (Helmet, CORS, RateLimiter, ValidationPipe)           |
+---------------------------------+---------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  Domain Modules       |                   |  Infrastructure       |
|  - Health             |                   |  - PrismaService      |
|  - Auth (Phase 1)     |<--- Event Bus --->|  - RedisService       |
|  - Members (Phase 2)  |    (BullMQ)       |  - JobQueueModule     |
|  - Billing (Phase 4)  |                   |  - Terminus Health    |
+-----------+-----------+                   +-----------+-----------+
            |                                           |
            +---------------------+---------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  PostgreSQL 19 / 16   |                   |  Redis 7 (In-Memory)  |
|  (ACID Storage & RLS) |                   |  (Cache, Rate Limits) |
+-----------------------+                   +-----------------------+
```

---

## 2. Monorepo Organization & Boundary Enforcement

The repository is organized via `pnpm` workspaces:
- `packages/shared`: Sole authority for isomorphic DTOs, schemas, constants, and API contracts. Both `apps/api` and `apps/web` depend on this package.
- `apps/api`: NestJS backend containing all business logic, database migrations, and queue workers.
- `apps/web`: React client rendering the management console.
- `infrastructure`: Dockerfiles, Nginx configurations, and SQL initialization scripts.

---

## 3. Communication Patterns
- **Synchronous**: REST APIs via HTTP, standardized with `ApiResponse<T>` envelopes and RFC 7807 error responses.
- **Asynchronous / Background**: BullMQ backed by Redis for high-throughput, non-blocking workflows (biometric hardware log ingestion, SMS/WhatsApp notification dispatch, subscription billing reminders, PDF invoice generation).

---

## 4. Scalability Strategy
1. **Database Layer**: Read/write splitting, connection pooling via PgBouncer, and tenant-based Row Level Security (RLS).
2. **Caching Layer**: Redis cache-aside pattern for frequently queried gym membership tiers, gym branch metadata, and active gym trainer schedules.
3. **Stateless API Instances**: Horizontal scaling of NestJS instances behind a reverse proxy (Nginx / Cloudflare / AWS ALB) with centralized Redis session and rate limit tracking.
