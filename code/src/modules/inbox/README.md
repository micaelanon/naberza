# Inbox Module

## Purpose
Universal entry point for all incoming items. Everything enters through the inbox before being routed to other modules.

## Key Entities
- `InboxItem` — incoming item from any source

## Key Operations
- Create item (manual or via adapter)
- Classify item (rule-based or AI-suggested)
- Route item to target module
- Mark as reviewed / dismissed

## Phase Implementation
- Phase 1: Core CRUD and ingestion pipeline
- Phase 3+: Classification rules, AI suggestions

## TODO
- [ ] Prisma schema for InboxItem
- [ ] Inbox service (CRUD)
- [ ] Classification service
- [ ] API routes: POST /inbox, GET /inbox, PATCH /inbox/:id
- [ ] Event emission (inbox.item.created, inbox.item.classified)
- [ ] Tests
