# Naberza OS — Roadmap

## Phase 0 — Foundation (current)
**Status**: In progress

- [x] Architecture documentation
- [x] Module definitions and boundaries
- [x] Domain model with entity specs
- [x] Integration contracts (provider interfaces)
- [x] Security strategy
- [x] Decision records
- [x] Project structure scaffolding
- [x] Base types and interfaces
- [x] Adapter stubs
- [x] Prisma schema (initial)
- [x] Audit log base
- [x] Inbox module base
- [x] Page scaffolds for all modules
- [x] Docker Compose for local dev
- [x] env.example with all required vars

## Phase 1 — Core Loop
**Goal**: Inbox → classify → route → persist → audit → dashboard

- [ ] PostgreSQL + Prisma fully operational
- [ ] NextAuth.js authentication (single-user)
- [ ] Inbox CRUD (manual item creation)
- [ ] Inbox classification (rule-based, manual)
- [ ] Task module (CRUD, views: today/upcoming/persistent/completed)
- [ ] Audit log recording and viewing
- [ ] Dashboard: today view with inbox + tasks
- [ ] Event bus wired for audit logging

## Phase 2 — Documents & Invoices
**Goal**: Paperless-ngx integration, invoice tracking

- [ ] Paperless-ngx adapter (read-only: search, list, metadata)
- [ ] Document module: link internal entities to Paperless docs
- [ ] Invoice module: create from inbox, link to documents
- [ ] Invoice status tracking (pending/paid/overdue)
- [ ] Inbox: auto-classify items that look like invoices

## Phase 3 — Home & Events
**Goal**: Home Assistant integration, event visibility

- [ ] Home Assistant adapter (read states, subscribe events)
- [ ] Home module: event log, dashboard cards
- [ ] HA events → InboxItem pipeline (for important events)
- [ ] Safe service calls with approval flow

## Phase 4 — Email Ingestion
**Goal**: Automated inbox population from email

- [ ] IMAP mail adapter
- [ ] Email → InboxItem pipeline
- [ ] Attachment extraction and document detection
- [ ] Invoice detection in emails
- [ ] Polling job with configurable interval

## Phase 5 — Finance & Intelligence
**Goal**: Financial tracking, anomaly detection, AI classification

- [ ] Financial entry logging (from invoices and manual)
- [ ] Recurring charge detection
- [ ] Anomaly flagging
- [ ] AI-powered inbox classification
- [ ] AI document summarization
- [ ] Period summaries

## Phase 6 — Automations
**Goal**: Rule engine with approval workflow

- [ ] Automation rule CRUD
- [ ] Rule evaluation engine
- [ ] Approval request flow
- [ ] Configurable triggers and conditions
- [ ] Notification on rule execution

## Phase 7 — Notifications & Ideas
**Goal**: Multi-channel notifications, idea management

- [ ] Telegram notification adapter
- [ ] Email notification adapter
- [ ] Notification preferences
- [ ] Ideas module: capture, tag, promote, archive
- [ ] Quick capture from dashboard

## Phase 8 — Polish & Hardening
**Goal**: Production-ready quality

- [ ] Comprehensive error handling
- [ ] Rate limiting on all API routes
- [ ] Circuit breaker for all adapters
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
