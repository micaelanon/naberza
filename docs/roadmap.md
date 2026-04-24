# Naberza OS — Roadmap

## Estado actual (2026-04-24)

- **Phase 0 — Foundation**: ✅ completada
- **Phase 1 — Core Loop**: ✅ completada
- **Phase 2 — Adapters & ingestion layer**: ✅ completada
- **Phase 3 — Alignment & hardening**: ✅ completada
- **Phase 4 — Domain modules**: ✅ completada
- **Phase 5 — Automations & notifications**: ✅ completada
- **Phase 6 — Polish & hardening**: ✅ completada
- **Phase 7 — Make the app actually usable**: 🔄 en curso

> Nota de ejecución: la ejecución real del proyecto se desvió del roadmap original.
> En la práctica se implementó primero la capa de adapters antes de cerrar módulos de dominio.
> Este documento refleja el estado real confirmado en código y PRs mergeados.

---

## Phase 0 — Foundation
**Status**: ✅ Complete (PRs #24–#30)

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

---

## Phase 1 — Core Loop
**Goal**: Inbox → classify → route → persist → audit → dashboard
**Status**: ✅ Complete (PRs #32–#36)

- [x] PostgreSQL + Prisma operational
- [x] NextAuth.js authentication (single-user)
- [x] Inbox CRUD (manual item creation + classification)
- [x] Task module (CRUD, status: PENDING/IN_PROGRESS/COMPLETED)
- [x] Audit log recording and viewing
- [x] Dashboard with today view
- [x] Event bus wired for audit logging
- [x] 110 tests passing

---

## Phase 2 — Adapters & ingestion layer
**Goal**: Establish external integration entry points
**Status**: ✅ Complete (PRs #38–#40)

- [x] Paperless-ngx adapter (read-only: search, list, metadata)
- [x] Home Assistant adapter (read states, call services, test connection)
- [x] Home Assistant alerts → InboxItem pipeline
- [x] IMAP mail adapter
- [x] Email → InboxItem pipeline
- [x] Invoice/document detection in emails
- [x] Webhook ingestion API
- [x] Adapter sync functions covered by tests

---

## Phase 3 — Alignment & hardening
**Goal**: Remove contradictions between docs, structure and implementation
**Status**: ✅ Complete (PRs #41–#50)

- [x] Phase 3 audit baseline
- [x] CSS hardcoded colors replaced by design tokens
- [x] Default export alignment
- [x] Legacy adapter stubs removed
- [x] Sync tests for Paperless, Home Assistant, Mail
- [x] CI: 4-job pipeline (lint, type-check, unit-test, build)
- [x] Semgrep workflow
- [x] loading.tsx and error.tsx for all data-fetching segments
- [x] Webhook route tests
- [x] Props/type location alignment

---

## Phase 4 — Domain modules
**Goal**: Close domain gaps left behind by adapter-first execution
**Status**: ✅ Complete (PRs #51–#56)

- [x] Document module: internal entities linked to Paperless docs
- [x] Invoice module: create from inbox, link to documents
- [x] Invoice status tracking (PENDING/PAID/OVERDUE/CANCELLED)
- [x] Home module: event log and dashboard cards
- [x] Finance module: financial entries and recurring detection
- [x] Ideas module: capture, tag, promote, archive
- [x] Architecture review (Opus)

---

## Phase 5 — Automations & notifications
**Goal**: Rule engine, approval workflow and outbound communication
**Status**: ✅ Complete (PRs #57–#64, ~409 tests)

- [x] Automation rule CRUD
- [x] Rule evaluation engine
- [x] Approval request flow
- [x] Configurable triggers and conditions
- [x] Telegram notification adapter
- [x] Email notification adapter
- [x] Integration tests for automations

---

## Phase 6 — Polish & hardening
**Goal**: Production-readiness and operational reliability
**Status**: ✅ Complete (PRs #65–#72, ~420 tests)

- [x] Dashboard stats with real data from all repos
- [x] PrismaAuditStore (replaces in-memory)
- [x] Service factory pattern (8 singletons)
- [x] Database indexes (8 new indexes on critical queries)
- [x] Rate limiting (in-memory, 100 req/min)
- [x] Adapter retry + circuit breaker (exponential backoff + jitter)
- [x] Health check API (`GET /api/health`)
- [x] Security audit + CSRF protection + 6 HTTP security headers

---

## Phase 7 — Make the app actually usable
**Goal**: Full CRUD UI, UX polish, and real usability across all modules
**Status**: ✅ Complete

- [x] Create forms: tasks, inbox, ideas, invoices, finance (PR #73)
- [x] Sidebar visual polish + warm palette tokens (PR #74)
- [x] Emoji → Material Symbols migration (PR #75)
- [x] Edit forms: tasks, inbox, ideas, invoices, finance (PR #76)
- [x] Integrations setup guide (step-by-step) (PR #76)
- [x] Delete with confirmation modal: all modules (PR #79)
- [x] Integrations live status (ping + env check + pills) (PR #80)
- [x] Client-side filters + search: tasks, inbox, ideas, invoices, finance (PR #81)
- [x] Dashboard with real data for all modules + StatsBar (PR #82)
- [x] Toast notifications for all CRUD actions (PR #83)
- [x] Reusable Pagination component; documents + home paginated (PR #84)
- [x] invoices-view: migrate to useFormSubmit + pagination (PR #85)
- [x] Settings page with session info, theme toggle, version (PR #86)
- [x] Roadmap update to real completed state (PR #87)
- [x] Pagination for CRUD-heavy list views (tasks, inbox, ideas, finance) (PR #88)
- [x] Actionable daily digest on dashboard (PR #89)
- [x] Mail analysis focused on actionable inbox processing (PR #90)
- [x] Live Home Assistant overview (PR #91)
- [x] Refactor: lint/tooling alignment (PR #96)
- [x] Refactor: top-level types extraction (PR #97)
- [x] Refactor: normalize component declarations (PR #98)
- [x] Refactor: remove remaining client console usage (PR #99)

---

## Phase 8 — Alignment after usability push
**Goal**: Keep docs, conventions and implementation aligned after the Phase 7 usability work
**Status**: 🔄 In progress

- [x] Lint/tooling alignment
- [x] Type extraction cleanup
- [x] Component declaration normalization
- [x] Client console cleanup
- [ ] Refresh top-level documentation to match the real shipped state
- [ ] Decide and document the next execution track after the usability/refactor pass

---

## Out of Scope (indefinitely)

- Multi-user / team features
- Enterprise RBAC
- Microservice extraction
- Trading / financial execution
- Rebuilding Paperless-ngx features
- Rebuilding Home Assistant features
- Mobile app (responsive web only)
- Multi-agent AI
