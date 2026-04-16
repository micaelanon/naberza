# Naberza OS — Architecture

## Vision

Naberza OS is a **personal home operations system** — a centralized layer that connects external services (Paperless-ngx, Home Assistant, email, etc.) and presents a unified, auditable, and controllable dashboard.

It is **not** a replacement for those services. It is the **orchestration and visibility layer** on top of them.

## Core Principles

1. **Single source of truth**: Naberza OS owns the inbox, classification, audit trail, and user decisions. External services own their domain data.
2. **Modular monolith**: One deployable unit with strict module boundaries. No premature microservices.
3. **Adapters, not reimplementations**: External services are accessed through typed adapters. Naberza never duplicates their core logic.
4. **Auditability by default**: Every significant action is logged with origin, actor, rule, and outcome.
5. **Safe by default**: Sensitive actions require explicit approval. AI can suggest but not execute without control.
6. **Exception-driven UX**: The dashboard shows what needs attention, not everything.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     NABERZA OS                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Dashboard │  │  Inbox   │  │  Tasks   │  ...modules  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │             │                     │
│  ┌────┴──────────────┴─────────────┴──────────────────┐ │
│  │              APPLICATION LAYER                      │ │
│  │  (use cases, classification, rules, orchestration)  │ │
│  └────┬──────────────┬─────────────┬──────────────────┘ │
│       │              │             │                     │
│  ┌────┴──────┐ ┌─────┴─────┐ ┌────┴──────┐             │
│  │  Domain   │ │   Audit   │ │   Jobs    │             │
│  │  Models   │ │   Log     │ │  /Queue   │             │
│  └────┬──────┘ └─────┬─────┘ └────┬──────┘             │
│       │              │             │                     │
│  ┌────┴──────────────┴─────────────┴──────────────────┐ │
│  │              INFRASTRUCTURE LAYER                   │ │
│  │  (database, adapters, storage, auth, config)        │ │
│  └────┬──────────────┬─────────────┬──────────────────┘ │
│       │              │             │                     │
│  ┌────┴──────┐ ┌─────┴─────┐ ┌────┴──────┐             │
│  │ PostgreSQL│ │ Paperless │ │   Home    │  ...adapters │
│  │  (Prisma) │ │   -ngx    │ │ Assistant │             │
│  └───────────┘ └───────────┘ └───────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TypeScript | Already in place, excellent DX, SSR/RSC capable |
| **Backend** | Next.js API Routes (Route Handlers) | Same deployment unit, no separate server needed |
| **Database** | PostgreSQL | Relational model fits the domain; audit log, relations, queries |
| **ORM** | Prisma | Type-safe, great migration tooling, works natively with Next.js |
| **Auth** | NextAuth.js (Auth.js v5) | Single-user initially, but proper auth foundation from day 1 |
| **Jobs** | BullMQ + Redis (optional, later) | For async ingestion, classification, scheduled rules |
| **Styling** | CSS Modules + Design Tokens | Already established, clean, no runtime overhead |
| **Testing** | Vitest + Testing Library | Already configured |
| **Containerization** | Docker + docker-compose | Local dev with PostgreSQL, Redis, and optionally Paperless/HA |
| **Deployment** | Vercel (frontend) + self-hosted backend option | Flexible: Vercel for UI, can add VPS for jobs/integrations |

## Module Boundaries

Each module owns:
- Its domain types
- Its application logic (use cases)
- Its API routes
- Its UI pages and components
- Its database queries (through shared Prisma client)

Modules communicate through:
- Shared domain events (typed, via event bus)
- Direct imports of other modules' **public interfaces only**
- Never direct database access across module boundaries

## Data Flow — Central Pipeline

```
External Source / Manual Input
        │
        ▼
    Ingestion (adapter normalizes to InboxItem)
        │
        ▼
    InboxItem created (status: pending)
        │
        ▼
    Classification (rules + AI suggestion)
        │
        ▼
    Routing: auto-action OR manual review
        │
        ▼
    Action executed (create task, file document, log invoice...)
        │
        ▼
    Audit event recorded
        │
        ▼
    Dashboard reflects new state
```

## Security Model

- **Authentication**: Required for all routes. Single-user to start, expandable.
- **Authorization**: Module-level. Sensitive actions (delete, approve, external write) require explicit confirmation.
- **Secrets**: Environment variables only. Never in code, never in client bundle.
- **External integrations**: Read-only by default. Write operations are opt-in and audited.
- **AI actions**: Suggestion-only. No autonomous execution of sensitive operations.
- **API routes**: All authenticated. CSRF protection via Next.js defaults.

## Deployment Topology (Initial)

```
┌──────────────┐     ┌──────────────┐
│   Vercel     │     │  Self-hosted │
│  (Next.js)   │────▶│  PostgreSQL  │
│  UI + API    │     │  (Docker)    │
└──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │   Docker    │
                     │  Compose    │
                     │  (local)    │
                     │  - Postgres │
                     │  - Redis*   │
                     │  - Paperless│
                     │  - HA*      │
                     └─────────────┘
                     * = optional
```

## What This Architecture Does NOT Include (by design)

- Microservices
- Multi-tenant / enterprise permissions
- Trading or financial execution
- Autonomous AI agents
- Complex workflow engines
- GraphQL
- Mobile app (web-first, responsive)
