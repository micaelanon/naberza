-- Migration: 20260417000000_add_performance_indexes
-- Phase 6 (P6-04) — Add missing indexes for hot query paths

-- inbox_items: filter by sourceType and priority (both used in InboxRepository.buildWhereClause)
CREATE INDEX "inbox_items_source_type_idx" ON "inbox_items"("source_type");
CREATE INDEX "inbox_items_priority_idx" ON "inbox_items"("priority");

-- documents: orderBy createdAt is default for all list queries
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at" DESC);

-- invoices: filter by isRecurring and orderBy createdAt
CREATE INDEX "invoices_is_recurring_idx" ON "invoices"("is_recurring");
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at" DESC);

-- financial_entries: orderBy createdAt used in list queries
CREATE INDEX "financial_entries_created_at_idx" ON "financial_entries"("created_at" DESC);

-- audit_events: module+action is the most common compound query in audit reporting
CREATE INDEX "audit_events_module_action_idx" ON "audit_events"("module", "action");

-- automation_rules: rules lookup always filters enabled=true AND triggerEvent
CREATE INDEX "automation_rules_enabled_trigger_idx" ON "automation_rules"("enabled", "trigger_event");
