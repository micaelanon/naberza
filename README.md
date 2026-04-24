# Naberza OS

A personal home operations system providing centralized inbox management, task scheduling, document handling, home automation integration, and financial tracking.

**Status**: Phase 7 (Make the app actually usable) — in progress after Foundations, adapters, hardening, domain modules, automations and usability milestones already merged.

## Project Structure

```
naberza/
├── .github/               # CI/CD workflows
├── code/                  # Next.js application + source code
│   ├── src/
│   │   ├── app/           # App Router pages and layouts
│   │   ├── components/    # React components (UI + domain)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Business logic (events, audit, adapters, DB)
│   │   ├── modules/       # Domain modules (inbox, tasks, documents, etc.)
│   │   ├── styles/        # CSS modules and design tokens
│   │   └── types/         # TypeScript domain types
│   ├── prisma/            # Database schema and migrations
│   ├── public/            # Static assets
│   ├── .env.example       # Environment template
│   └── package.json
├── docs/
│   ├── architecture.md    # System design and data flow
│   ├── domain-model.md    # Entity definitions (12 entities)
│   ├── modules.md         # Module boundaries and ownership
│   ├── integrations.md    # Provider interfaces (Paperless, HA, Mail)
│   ├── security.md        # Auth, secrets, safety
│   ├── decisions.md       # Architecture Decision Records (ADRs)
│   ├── roadmap.md         # 8-phase development plan
│   └── docker-setup.md    # Local dev environment with Docker
├── Dockerfile             # Production image (multi-stage)
├── docker-compose.yml     # Local dev orchestration
├── CONTRIBUTING.md        # Development guidelines
├── RELEASE.md             # Deployment procedures
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Node.js 22+
- Docker + Docker Compose (for local dev database)
- Git

### 1. Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values (see `docs/docker-setup.md` for details).

### 2. Start Local Environment

```bash
docker-compose up -d
```

App available at http://localhost:3000

### 3. Development Workflow

```bash
cd code
npm install
npm run dev          # http://localhost:3000
npm run check        # lint + type-check + tests + build
```

See `docs/docker-setup.md` for full Docker setup and troubleshooting.

## Architecture Overview

### Modular Monolith

11 domain modules with strict boundaries:

- **Inbox**: Incoming items from external sources
- **Tasks**: Personal task management (today, upcoming, persistent, completed)
- **Documents**: Links to Paperless-ngx documents
- **Invoices**: Financial document tracking
- **Finance**: Financial entry logging and analytics
- **Home**: Home Assistant integration and events
- **Ideas**: Idea capture and tagging
- **Automations**: Rule engine with approval workflows
- **Integrations**: Provider interfaces and adapter registry
- **Audit**: Immutable event log (append-only)
- **Users**: Single-user settings and preferences

### Core Infrastructure (Phase 0 ✅)

- **Event Bus**: Typed, async, error-isolated
- **Audit Service**: Append-only log with filtering/pagination
- **Adapter Registry**: Lifecycle management for external services
- **Prisma ORM**: Type-safe database operations
- **NextAuth.js v4**: Single-user authentication

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 16 (App Router) | App Router + React 19 |
| Language | TypeScript (strict) | 100% type-safe |
| Database | PostgreSQL 16 | Prisma ORM |
| Auth | NextAuth.js 4.24.14 | Single-user in Phase 0 |
| Testing | Vitest + Jest DOM | Fast, ESM-native |
| Linting | ESLint | simple-import-sort, SonarJS |
| Styling | CSS custom properties + BEM | Design tokens (warm palette) |
| Deployment | Vercel | Auto-deploy on push to develop/main |
| Local Dev | Docker Compose | PostgreSQL + app containerization |

## Development Guidelines

### Git Workflow

- **Develop branch** (`develop`): Integration branch, latest stable
- **Main branch** (`main`): Production-ready releases only
- **Feature branches**: `feature/*`, `bugfix/*`, `internal/*`

### Code Quality Standards

- **Lint**: 0 errors (ESLint + SonarJS)
- **Types**: Strict mode passes
- **Tests**: All passing
- **Build**: Production build succeeds
- **Duplication**: 0 code clones (jscpd)

### No TODOs in Code

Keep `.ts` files clean (CodeQL flags TODOs as errors). Use `README.md` files in modules instead.

## Deployment

### Local Docker

```bash
docker-compose up -d
```

See `docs/docker-setup.md` for troubleshooting.

### Production (Vercel)

```bash
git push origin develop     # Preview deploy
git checkout main && git merge develop && git push  # Production
```

See `RELEASE.md` for full deployment checklist.

## Roadmap

### Current real state
- [x] Phase 0: Foundation
- [x] Phase 1: Core Loop
- [x] Phase 2: Adapters & ingestion layer
- [x] Phase 3: Alignment & hardening
- [x] Phase 4: Domain modules
- [x] Phase 5: Automations & notifications
- [x] Phase 6: Polish & hardening
- [~] Phase 7: Make the app actually usable

See `docs/roadmap.md` for the detailed, continuously-updated breakdown.

## Documentation

- **Architecture**: `docs/architecture.md`
- **Domain Model**: `docs/domain-model.md`
- **Modules**: `docs/modules.md`
- **Integrations**: `docs/integrations.md`
- **Security**: `docs/security.md`
- **Decisions**: `docs/decisions.md` (ADRs)
- **Roadmap**: `docs/roadmap.md`
- **Docker**: `docs/docker-setup.md`
- **Contributing**: `CONTRIBUTING.md`
- **Release**: `RELEASE.md`

## Environment Variables

See `.env.local.example` and `code/.env.example` for full reference.

Key variables:
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## License

MIT

