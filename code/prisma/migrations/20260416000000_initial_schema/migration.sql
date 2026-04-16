-- Migration: 001_initial_schema
-- Created: 2026-04-16
-- Phase 0 — Foundation: All domain entities

-- ─────────────────────────────────────────────
-- USERS module
-- ─────────────────────────────────────────────

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "image" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "session_token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

CREATE TABLE "user_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_user_id_key_key" ON "user_preferences"("user_id", "key");

-- ─────────────────────────────────────────────
-- INTEGRATIONS module
-- ─────────────────────────────────────────────

CREATE TYPE "ConnectionType" AS ENUM ('PAPERLESS', 'HOME_ASSISTANT', 'EMAIL_IMAP', 'EMAIL_WEBHOOK', 'API', 'CUSTOM');
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

CREATE TABLE "source_connections" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ConnectionType" NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'INACTIVE',
  "config" JSONB NOT NULL,
  "permission_read" BOOLEAN NOT NULL DEFAULT true,
  "permission_write" BOOLEAN NOT NULL DEFAULT false,
  "last_health_check" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "source_connections_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────
-- INBOX module
-- ─────────────────────────────────────────────

CREATE TYPE "InboxSourceType" AS ENUM ('EMAIL', 'PAPERLESS', 'HOME_ASSISTANT', 'MANUAL', 'API');
CREATE TYPE "InboxClassification" AS ENUM ('TASK', 'DOCUMENT', 'INVOICE', 'EVENT', 'ALERT', 'IDEA', 'FINANCIAL', 'REVIEW');
CREATE TYPE "ClassifiedBy" AS ENUM ('RULE', 'AI_SUGGESTION', 'MANUAL');
CREATE TYPE "InboxStatus" AS ENUM ('PENDING', 'CLASSIFIED', 'ROUTED', 'DISMISSED', 'FAILED');
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');

CREATE TABLE "inbox_items" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "source_type" "InboxSourceType" NOT NULL,
  "source_connection_id" TEXT,
  "source_external_id" TEXT,
  "source_raw_payload" JSONB,
  "classification" "InboxClassification",
  "classified_by" "ClassifiedBy",
  "classification_confidence" DOUBLE PRECISION,
  "status" "InboxStatus" NOT NULL DEFAULT 'PENDING',
  "routed_to_module" TEXT,
  "routed_to_entity_id" TEXT,
  "priority" "Priority" NOT NULL DEFAULT 'NONE',
  "metadata" JSONB,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inbox_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inbox_items_status_idx" ON "inbox_items"("status");
CREATE INDEX "inbox_items_classification_idx" ON "inbox_items"("classification");
CREATE INDEX "inbox_items_created_at_idx" ON "inbox_items"("created_at" DESC);

-- ─────────────────────────────────────────────
-- TASKS module
-- ─────────────────────────────────────────────

CREATE TYPE "TaskKind" AS ENUM ('NORMAL', 'PERSISTENT', 'RECURRING');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "tasks" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "Priority" NOT NULL DEFAULT 'NONE',
  "kind" "TaskKind" NOT NULL DEFAULT 'NORMAL',
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "due_at" TIMESTAMP(3),
  "recurrence_rule" TEXT,
  "tags" TEXT[],
  "inbox_item_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tasks_inbox_item_id_key" ON "tasks"("inbox_item_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_due_at_idx" ON "tasks"("due_at");
CREATE INDEX "tasks_kind_idx" ON "tasks"("kind");

-- ─────────────────────────────────────────────
-- DOCUMENTS module
-- ─────────────────────────────────────────────

CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'CONTRACT', 'RECEIPT', 'LETTER', 'CERTIFICATE', 'OTHER');

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "external_url" TEXT,
  "source_connection_id" TEXT NOT NULL,
  "document_type" "DocumentType" NOT NULL DEFAULT 'OTHER',
  "correspondent" TEXT,
  "tags" TEXT[],
  "content_preview" TEXT,
  "archived_at" TIMESTAMP(3),
  "inbox_item_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_inbox_item_id_key" ON "documents"("inbox_item_id");
CREATE UNIQUE INDEX "documents_source_connection_id_external_id_key" ON "documents"("source_connection_id", "external_id");
CREATE INDEX "documents_document_type_idx" ON "documents"("document_type");

-- ─────────────────────────────────────────────
-- INVOICES module
-- ─────────────────────────────────────────────

CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED');

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "issue_date" DATE NOT NULL,
  "due_date" DATE,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "category" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "document_id" TEXT,
  "inbox_item_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_inbox_item_id_key" ON "invoices"("inbox_item_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX "invoices_issuer_idx" ON "invoices"("issuer");

-- ─────────────────────────────────────────────
-- FINANCE module
-- ─────────────────────────────────────────────

CREATE TYPE "FinancialEntryType" AS ENUM ('INCOME', 'EXPENSE', 'BALANCE_SNAPSHOT', 'RECURRING_CHARGE');

CREATE TABLE "financial_entries" (
  "id" TEXT NOT NULL,
  "type" "FinancialEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "category" TEXT,
  "description" TEXT,
  "date" DATE NOT NULL,
  "invoice_id" TEXT,
  "is_anomaly" BOOLEAN NOT NULL DEFAULT false,
  "anomaly_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_entries_type_idx" ON "financial_entries"("type");
CREATE INDEX "financial_entries_date_idx" ON "financial_entries"("date");
CREATE INDEX "financial_entries_is_anomaly_idx" ON "financial_entries"("is_anomaly");

-- ─────────────────────────────────────────────
-- HOME module
-- ─────────────────────────────────────────────

CREATE TYPE "HomeSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TABLE "home_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "state" TEXT,
  "previous_state" TEXT,
  "attributes" JSONB,
  "source_connection_id" TEXT NOT NULL,
  "severity" "HomeSeverity" NOT NULL DEFAULT 'INFO',
  "acknowledged_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "home_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "home_events_event_type_idx" ON "home_events"("event_type");
CREATE INDEX "home_events_entity_id_idx" ON "home_events"("entity_id");
CREATE INDEX "home_events_severity_idx" ON "home_events"("severity");
CREATE INDEX "home_events_created_at_idx" ON "home_events"("created_at" DESC);

-- ─────────────────────────────────────────────
-- IDEAS module
-- ─────────────────────────────────────────────

CREATE TYPE "IdeaStatus" AS ENUM ('CAPTURED', 'REVIEWED', 'PROMOTED', 'ARCHIVED');

CREATE TABLE "ideas" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "tags" TEXT[],
  "status" "IdeaStatus" NOT NULL DEFAULT 'CAPTURED',
  "promoted_to_module" TEXT,
  "promoted_to_entity_id" TEXT,
  "inbox_item_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ideas_inbox_item_id_key" ON "ideas"("inbox_item_id");
CREATE INDEX "ideas_status_idx" ON "ideas"("status");

-- ─────────────────────────────────────────────
-- AUTOMATIONS module
-- ─────────────────────────────────────────────

CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED');

CREATE TABLE "automation_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger_event" TEXT NOT NULL,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "last_triggered_at" TIMESTAMP(3),
  "execution_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_rules_enabled_idx" ON "automation_rules"("enabled");
CREATE INDEX "automation_rules_trigger_event_idx" ON "automation_rules"("trigger_event");

CREATE TABLE "approval_requests" (
  "id" TEXT NOT NULL,
  "automation_rule_id" TEXT NOT NULL,
  "trigger_event_payload" JSONB NOT NULL,
  "proposed_actions" JSONB NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decided_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "approval_requests_expires_at_idx" ON "approval_requests"("expires_at");

-- ─────────────────────────────────────────────
-- AUDIT module
-- ─────────────────────────────────────────────

CREATE TYPE "AuditActor" AS ENUM ('USER', 'SYSTEM', 'AUTOMATION', 'INTEGRATION');
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "actor" "AuditActor" NOT NULL,
  "actor_detail" TEXT,
  "input" JSONB,
  "output" JSONB,
  "status" "AuditStatus" NOT NULL,
  "error_message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- Append-only: no updated_at, no soft delete
CREATE INDEX "audit_events_module_idx" ON "audit_events"("module");
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");
CREATE INDEX "audit_events_actor_idx" ON "audit_events"("actor");
CREATE INDEX "audit_events_status_idx" ON "audit_events"("status");
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at" DESC);

-- ─────────────────────────────────────────────
-- FOREIGN KEYS (after all tables exist)
-- ─────────────────────────────────────────────

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_source_connection_id_fkey"
  FOREIGN KEY ("source_connection_id") REFERENCES "source_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_inbox_item_id_fkey"
  FOREIGN KEY ("inbox_item_id") REFERENCES "inbox_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_inbox_item_id_fkey"
  FOREIGN KEY ("inbox_item_id") REFERENCES "inbox_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_inbox_item_id_fkey"
  FOREIGN KEY ("inbox_item_id") REFERENCES "inbox_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "home_events" ADD CONSTRAINT "home_events_source_connection_id_fkey"
  FOREIGN KEY ("source_connection_id") REFERENCES "source_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ideas" ADD CONSTRAINT "ideas_inbox_item_id_fkey"
  FOREIGN KEY ("inbox_item_id") REFERENCES "inbox_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_automation_rule_id_fkey"
  FOREIGN KEY ("automation_rule_id") REFERENCES "automation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
