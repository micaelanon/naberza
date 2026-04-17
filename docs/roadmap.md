# Naberza OS — Roadmap

## Estado actual

- **Phase 0 — Foundation**: ✅ completada
- **Phase 1 — Core Loop**: ✅ completada
- **Phase 2 — Adapters & ingestion layer**: ✅ completada en la práctica
- **Phase 3 — Alignment & hardening of current implementation**: 🔄 en curso

> Nota importante: la ejecución real del proyecto se desvió del roadmap original.
> En la práctica se implementó primero la capa de adapters (`Paperless`, `Home Assistant`, `IMAP`, `webhooks`) antes de cerrar módulos de dominio como `documents`, `invoices`, `home` o `finance`.
> Este documento refleja el estado real, no el orden aspiracional inicial.

## Phase 0 — Foundation
**Status**: ✅ Complete

- [x] Architecture documentation
- [x] Module definitions and boundaries
- [x] Domain model with entity specs
- [x] Integration contracts (provider interfaces)
- [x] Security strategy
- [x] Decision records
- [x] Project structure scaffolding
- [x] Base types and interfaces
- [x] Initial adapter scaffolding
- [x] Prisma schema (initial)
- [x] Audit log base
- [x] Inbox module base
- [x] Page scaffolds for all modules
- [x] Docker Compose for local dev
- [x] env example with required vars

## Phase 1 — Core Loop
**Goal**: Inbox → classify → route → persist → audit → dashboard
**Status**: ✅ Complete

- [x] PostgreSQL + Prisma operational
- [x] NextAuth.js authentication (single-user)
- [x] Inbox CRUD (manual item creation)
- [x] Inbox classification (rule-based, manual)
- [x] Task module (CRUD, views: today/upcoming/persistent/completed)
- [x] Audit log recording and viewing
- [x] Dashboard: today view with inbox + tasks
- [x] Event bus wired for audit logging

## Phase 2 — Adapters & ingestion layer
**Goal**: establish external integration entry points before completing remaining domain modules
**Status**: ✅ Complete

- [x] Paperless-ngx adapter (read-only: search, list, metadata)
- [x] Home Assistant adapter (read states, call services, test connection)
- [x] Home Assistant alerts → InboxItem pipeline
- [x] IMAP mail adapter
- [x] Email → InboxItem pipeline
- [x] Invoice/document detection in emails
- [x] Webhook ingestion API
- [x] Adapter sync functions covered by tests

## Phase 3 — Alignment & hardening of current implementation
**Goal**: remove contradictions between docs, structure and implementation; harden the current base before new domain work
**Status**: 🔄 In progress

### Completed in Phase 3
- [x] Phase 3 audit baseline (`docs/phase-3-audit.md`)
- [x] CSS hardcoded colors replaced by tokens
- [x] Default export alignment in component barrels/imports
- [x] Legacy integration adapter stubs removed from `src/modules/integrations/adapters`
- [x] Sync function tests added for Paperless, Home Assistant and Mail
- [x] CI split into separate jobs (`lint`, `type-check`, `unit-test`, `build`)
- [x] Semgrep workflow added

### Remaining in Phase 3
- [ ] `loading.tsx` and `error.tsx` for data-fetching segments
- [ ] Webhook route tests
- [ ] Props/type location review where applicable

## Phase 4 — Domain modules completion
**Goal**: close the domain gaps left behind by the adapter-first execution order

- [ ] Document module: link internal entities to Paperless docs
- [ ] Invoice module: create from inbox, link to documents
- [ ] Invoice status tracking (pending/paid/overdue)
- [ ] Home module: event log and dashboard cards
- [ ] Finance module: financial entries and recurring detection
- [ ] Ideas module: capture, tag, promote, archive

## Phase 5 — Automations & notifications
**Goal**: rule engine, approval workflow and outbound communication

- [ ] Automation rule CRUD
- [ ] Rule evaluation engine
- [ ] Approval request flow
- [ ] Configurable triggers and conditions
- [ ] Telegram notification adapter
- [ ] Email notification adapter
- [ ] Notification preferences

## Phase 6 — Polish & hardening
**Goal**: production-readiness and operational reliability

- [ ] Comprehensive error handling
- [ ] Rate limiting on relevant API routes
- [ ] Circuit breaker strategy for adapters
- [ ] Monitoring and health dashboard
- [ ] Data export/import
- [ ] Audit log retention policies
- [ ] Performance optimization
- [ ] Accessibility review

## Out of Scope (indefinitely)

- Multi-user / team features
- Enterprise RBAC
- Microservice extraction
- Trading / financial execution
- Rebuilding Paperless-ngx features
- Rebuilding Home Assistant features
- Mobile app (responsive web only)
- Multi-agent AI
