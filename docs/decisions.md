# Naberza OS — Architecture Decision Records

## ADR-001: Modular Monolith over Microservices

**Status**: Accepted
**Date**: 2026-04-16

**Context**: The system has ~12 modules with interconnected data flows. A single developer maintains it.

**Decision**: Build as a modular monolith within a single Next.js application. Strict module boundaries enforced by convention and directory structure, not deployment units.

**Rationale**:
- Single deployable = simpler ops, debugging, and local dev
- Module boundaries are enforced architecturally, not by network
- Can extract modules to services later if truly needed
- One person maintaining microservices is a net negative

**Consequences**: Must be disciplined about module boundaries. No cross-module database queries. Public interfaces only.

---

## ADR-002: PostgreSQL as Primary Database

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Need relational data with audit trail, JSON fields for flexible metadata, and robust querying.

**Decision**: PostgreSQL via Prisma ORM.

**Rationale**:
- Relational model fits the domain (entities, relations, audit trail)
- JSON/JSONB for flexible fields (metadata, config, payloads)
- Prisma provides type-safe access and excellent migration tooling
- Battle-tested, well-supported, great ecosystem

**Rejected alternatives**:
- Supabase (current): Added complexity without benefit for a self-hosted system. Direct Postgres + Prisma is cleaner.
- SQLite: Not suitable for concurrent access from jobs/workers.
- MongoDB: Relational model is a better fit for this domain.

---

## ADR-003: Adapters over Direct API Calls

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Multiple external services (Paperless, Home Assistant, email) need to be integrated.

**Decision**: Every external service is accessed through a typed adapter implementing a provider interface. No direct API calls from application code.

**Rationale**:
- Testable: mock adapters for testing
- Swappable: can change backend service without touching application logic
- Auditable: centralized logging point
- Type-safe: compile-time contracts

---

## ADR-004: Moving Away from Supabase

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Current app uses Supabase client directly from the frontend with localStorage fallback. The new architecture needs a proper backend with server-side logic, jobs, and adapter orchestration.

**Decision**: Replace Supabase with direct PostgreSQL + Prisma. Auth via NextAuth.js.

**Rationale**:
- Supabase client-side calls don't fit a system with server-side ingestion, jobs, and adapter orchestration
- Direct Postgres + Prisma gives full control over schema, migrations, and queries
- NextAuth provides flexible auth without Supabase dependency
- Simpler infrastructure: just a Postgres instance

**Migration path**: The existing task data (if any in Supabase) can be exported and imported via a migration script.

---

## ADR-005: Inbox-First Architecture

**Status**: Accepted
**Date**: 2026-04-16

**Context**: The system receives inputs from many sources (email, Paperless, Home Assistant, manual). Each input needs classification, routing, and audit.

**Decision**: All external inputs enter through the universal Inbox. Classification and routing happen as a pipeline before reaching target modules.

**Rationale**:
- Single entry point = single audit point
- Classification can be automated or manual
- Consistent traceability for all inputs
- Dashboard can show "what needs attention" from one source

---

## ADR-006: CSS Modules + Design Tokens (No CSS-in-JS, No Tailwind)

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Current app has a well-designed token system with custom CSS variables. The visual identity (moss/olive/cream palette) is intentional and premium.

**Decision**: Keep CSS Modules + design tokens. Do not introduce Tailwind or CSS-in-JS.

**Rationale**:
- Zero runtime overhead
- Existing token system is well-structured
- Visual identity is established and should be preserved
- CSS Modules provide scoping without framework lock-in
- Adding Tailwind would create two styling paradigms

---

## ADR-007: Server-Side Route Handlers for API

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Need API endpoints for adapter orchestration, ingestion, jobs, and internal module communication.

**Decision**: Use Next.js Route Handlers (`app/api/`) for all server-side endpoints.

**Rationale**:
- Same deployment unit as frontend
- TypeScript throughout
- Middleware for auth, rate limiting
- Can be extracted to standalone API server later if needed

---

## ADR-008: Event Bus for Inter-Module Communication

**Status**: Accepted
**Date**: 2026-04-16

**Context**: Modules need to react to events in other modules (e.g., audit logging on every action, automation rules evaluating events).

**Decision**: In-process typed event bus. Events are synchronous within the request lifecycle, with async handling for non-critical subscribers.

**Rationale**:
- Simple: no external message broker needed initially
- Type-safe: events are typed interfaces
- Testable: event bus can be mocked
- Extensible: can be replaced with a real message broker later

**Caveat**: If jobs/workers run in separate processes, they'll need a proper queue (BullMQ + Redis). The event bus is for in-process coordination only.
