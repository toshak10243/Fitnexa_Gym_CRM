# FITNEXA: AGENT BEHAVIORAL DIRECTIVES & ENGINEERING CONSTITUTION

This document defines non-negotiable rules governing any AI assistant, engineer, or automated agent operating within the Fitnexa codebase. These rules persist across all development phases.

---

## 1. Project Character & Identity
Fitnexa is an enterprise-grade Gym Management CRM / ERP built for real Indian gym businesses, franchise fitness chains, and commercial fitness centers.
- **Never create fake mocks, demo shortcuts, or incomplete prototypes.**
- All code must be production-grade, strictly typed, tested, and defensively programmed.
- The UI must look like high-value, bank-grade enterprise software.

---

## 2. Mandatory UI & Design System Rules

### Approved Color Palette
- **Deep Navy (`#0A192F` / `#0F223D`)**: Sidebar chrome, dark headers, primary structural dividers, primary actions.
- **Premium Red (`#B91C1C` / `#991B1B`)**: Active indicators, system alerts, primary CTA accents.
- **Warm Off-White (`#FBFBF9` / `#F5F5F0`)**: Application background canvas, cards, and modal surfaces.
- **Neutral Gray (`#E5E7EB` borders, `#6B7280` muted text, `#111827` primary body)**: Structural dividers and high-contrast typography.

### Strictly Forbidden Elements
Agents must never generate or propose:
- 🚫 Harsh gradients or neon color schemes.
- 🚫 **Lucide icons** (Use accessible custom SVGs or Radix UI headless icons).
- 🚫 **Pure white (`#FFFFFF`) backgrounds** (Always use warm off-white `#FBFBF9`).
- 🚫 Rainbow colors or saturated pastels.
- 🚫 Drop shadows (Use clean 1px borders `border-[#E5E7EB]`).
- 🚫 Three feature cards in one row or three-tier pricing tables.
- 🚫 Emojis in enterprise screens, notifications, or logs.
- 🚫 Liquid glass / glassmorphism effects.
- 🚫 Em dashes (`—`) in copy.
- 🚫 **Inter, Geist, or Space Grotesk fonts** (Use `Plus Jakarta Sans` or clean system sans).
- 🚫 Colored left stripes on cards or tables.
- 🚫 Fake testimonials or fabricated metrics.
- 🚫 Bento grids or terminal window UI motifs.
- 🚫 "It's not X, it's Y" copywriting.
- 🚫 Checkmark bullets or checkmark badge lists.
- 🚫 Rounded pill buttons or excessively soft corner radii (Use `rounded-none` or `rounded-sm`).
- 🚫 Purple and black themes, radial orbs, dot grids, sparkle icons, animated arrows.
- 🚫 Hover bounce animations or distracting motion.

### Accessibility & Interaction Standards
- Strictly respect `prefers-reduced-motion` media queries.
- Ensure all interactive elements have visible keyboard focus rings (`focus-visible:outline-2`).
- Provide skeleton loaders for all asynchronous loading states.
- Support smooth scrolling without hijacking natural browser physics.

---

## 3. Mandatory Security & Architecture Rules

- **Server-Side Authorization**: Never trust frontend permissions or claims. Authorize every mutation and sensitive query on the server.
- **IDOR Protection**: All resource accesses must validate tenant isolation (`tenantId`) and user ownership server-side.
- **Parameterized Database Queries**: Never concatenate raw strings into database queries. Use Prisma parameterized operations.
- **PostgreSQL RLS**: Row Level Security policies must be maintained as multi-tenancy scales.
- **Rate Limiting**: Distributed Redis token-bucket rate limiting must protect authentication and sensitive endpoints.
- **Audit Trails**: All administrator mutations, billing actions, and role modifications must be recorded in an immutable audit ledger.
- **Least Privilege**: Application database connections must use dedicated least-privilege credentials (`fitnexa_app`), never superuser credentials.
- **Graceful Error Envelopes**: Errors must use RFC 7807 problem details; never leak database schemas, table names, or internal stack traces in production.

---

## 4. Phase Management
- Never begin a subsequent phase automatically without explicit instruction from the operator.
- Stop after completing the assigned phase deliverables and wait for verification.
