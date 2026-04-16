# Naberza OS

Personal home operations system — centralized inbox, task management, document handling, home automation integration, and financial tracking.

See `docs/` for architecture, modules, security, and roadmap.

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL (local or Docker)

### Setup

1. Clone the repo and install dependencies:
```bash
cd code
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Run the development server:
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Lint code |
| `npm run type-check` | TypeScript type check |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Generate coverage report |
| `npm run check:duplication` | Check code duplication |
| `npm run check` | Run all checks (lint, type-check, test, duplication) |

## Project Structure

```
code/
├── src/
│   ├── app/              # Next.js App Router (pages, layouts, API routes)
│   ├── components/       # Shared UI and domain components
│   ├── hooks/            # Shared custom hooks
│   ├── lib/              # Core utilities, auth, database clients
│   ├── types/            # Shared TypeScript types
│   ├── styles/           # Global styles and design tokens
│   └── modules/          # Domain modules (inbox, tasks, documents, etc.)
│       ├── inbox/
│       ├── tasks/
│       ├── documents/
│       └── ...
├── @types/               # Global type declarations
├── public/               # Static assets
├── vitest.setup.ts       # Test configuration
├── vitest.config.ts      # Vitest config
├── next.config.ts        # Next.js config
├── tsconfig.json         # TypeScript config
└── .env.example          # Environment variables template
```

## Architecture Principles

- **Modular Monolith**: Single Next.js app with strict module boundaries
- **Adapters over Direct API Calls**: External services accessed through typed adapters
- **Auditability by Default**: All significant actions logged
- **Safe by Default**: Sensitive actions require explicit approval
- **Event-driven**: Modules communicate via typed events

See `docs/architecture.md` for full architecture details.

## Development Workflow

1. Create a feature branch from `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. Implement your changes following the conventions:
   - Use `@/` path alias for imports
   - Keep modules separate with minimal cross-module queries
   - Write co-located tests
   - Update types as needed

3. Run checks before committing:
```bash
npm run check
```

4. Commit and push:
```bash
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

5. Create a PR to `develop` and wait for review

6. After merge, your changes integrate into the `pre` environment

## Git Workflow

- **main**: Production-ready code only
- **develop**: Integration branch (default)
- **feature/\***: New features
- **bugfix/\***: Non-production bug fixes
- **hotfix/\***: Production hotfixes
- **internal/\***: Tooling, docs, infrastructure, standards

See `docs/git-branching-workflow.instructions.md` for full details.

## Testing

All modules must have tests co-located with implementation:

```
module/
├── service.ts
├── service.test.ts
└── __tests__/
    └── integration.test.ts
```

Run tests:
```bash
npm run test           # Watch mode
npm run test:run       # Run once
npm run test:coverage  # With coverage report
```

## Deployment

### Development Environment
- Branch: `develop`
- Deployed to: Pre-production
- Automatic on merge to `develop`

### Production Environment
- Branch: `main`
- Deployed to: Production
- Manual workflow or tagged release

See `.github/workflows/` for CI/CD pipeline details.

## Phase Status

| Phase | Status | Target |
|-------|--------|--------|
| 0 — Foundation | ✅ Complete | Project structure, documentation |
| 1 — Core Loop | 🔄 In Progress | Database, auth, inbox, tasks, audit |
| 2 — Documents & Invoices | ⏳ Planned | Paperless integration |
| 3 — Home & Events | ⏳ Planned | Home Assistant integration |
| 4 — Email Ingestion | ⏳ Planned | IMAP adapter, automation |
| 5 — Finance & Intelligence | ⏳ Planned | Financial tracking, anomaly detection |
| 6 — Automations | ⏳ Planned | Rule engine, approval workflow |
| 7 — Notifications & Ideas | ⏳ Planned | Multi-channel notifications, idea capture |
| 8 — Polish & Hardening | ⏳ Planned | Production-ready quality |

See `docs/roadmap.md` for phase details and upcoming work.

## Documentation

- `docs/architecture.md` — System design, module boundaries, data flow
- `docs/modules.md` — Module descriptions, public interfaces, inter-module communication
- `docs/domain-model.md` — Entity definitions, relationships, ownership
- `docs/integrations.md` — Provider interfaces, adapter contracts, external service integration
- `docs/security.md` — Authentication, authorization, secrets, audit trail, AI safety
- `docs/decisions.md` — Architecture decision records (ADRs)
- `docs/roadmap.md` — Implementation phases and priorities

## Getting Help

- Check the documentation in `docs/`
- Review existing tests for examples
- Look at module READMEs for implementation details
- Open an issue or discussion on GitHub

## License

Private project. Not for public distribution.
