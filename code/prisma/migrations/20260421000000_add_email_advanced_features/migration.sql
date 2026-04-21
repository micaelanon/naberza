-- Migration: 20260421000000_add_email_advanced_features
-- Add email advanced features: Telegram alerts, cleanup rules, invoice extraction, summaries, and quick actions

-- ─────────────────────────────────────────────
-- PHASE 1: Telegram Preferences & Alerts
-- ─────────────────────────────────────────────

CREATE TABLE "telegram_preferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "telegram_user_id" INTEGER,
  "telegram_username" TEXT,
  "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
  "verification_code" TEXT,
  "verification_expires" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE TABLE "telegram_alerts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "telegram_preference_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger_type" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telegram_alerts_telegram_preference_id_fkey" FOREIGN KEY ("telegram_preference_id") REFERENCES "telegram_preferences" ("id") ON DELETE CASCADE
);

CREATE TABLE "telegram_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "telegram_preference_id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL UNIQUE,
  "text" TEXT NOT NULL,
  "parse_mode" TEXT NOT NULL DEFAULT 'HTML',
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "telegram_messages_telegram_preference_id_fkey" FOREIGN KEY ("telegram_preference_id") REFERENCES "telegram_preferences" ("id") ON DELETE CASCADE
);

CREATE INDEX "telegram_alerts_telegram_preference_id_idx" ON "telegram_alerts"("telegram_preference_id");
CREATE INDEX "telegram_alerts_enabled_idx" ON "telegram_alerts"("enabled");
CREATE INDEX "telegram_messages_telegram_preference_id_idx" ON "telegram_messages"("telegram_preference_id");
CREATE INDEX "telegram_messages_status_idx" ON "telegram_messages"("status");
CREATE INDEX "telegram_messages_sent_at_idx" ON "telegram_messages"("sent_at");

-- ─────────────────────────────────────────────
-- PHASE 2: Email Cleanup Rules
-- ─────────────────────────────────────────────

CREATE TABLE "email_cleanup_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "match_type" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "action" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "dry_run_enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_executed_at" TIMESTAMP(3),
  "matched_count" INTEGER NOT NULL DEFAULT 0,
  "executed_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "email_cleanup_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rule_id" TEXT NOT NULL,
  "inbox_item_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "was_preview" BOOLEAN NOT NULL DEFAULT true,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_cleanup_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "email_cleanup_rules" ("id") ON DELETE CASCADE
);

CREATE INDEX "email_cleanup_rules_user_id_idx" ON "email_cleanup_rules"("user_id");
CREATE INDEX "email_cleanup_rules_enabled_idx" ON "email_cleanup_rules"("enabled");
CREATE INDEX "email_cleanup_logs_rule_id_idx" ON "email_cleanup_logs"("rule_id");
CREATE INDEX "email_cleanup_logs_executed_at_idx" ON "email_cleanup_logs"("executed_at");

-- ─────────────────────────────────────────────
-- PHASE 3: Invoice Extraction
-- ─────────────────────────────────────────────

CREATE TABLE "invoice_extraction_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "inbox_item_id" TEXT NOT NULL,
  "extraction_method" TEXT NOT NULL,
  "extraction_confidence" DOUBLE PRECISION,
  "raw_pdf_path" TEXT,
  "ocr_full_text" TEXT,
  "extracted_invoice_id" TEXT,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

CREATE INDEX "invoice_extraction_logs_inbox_item_id_idx" ON "invoice_extraction_logs"("inbox_item_id");
CREATE INDEX "invoice_extraction_logs_status_idx" ON "invoice_extraction_logs"("status");
CREATE INDEX "invoice_extraction_logs_created_at_idx" ON "invoice_extraction_logs"("created_at");

-- ─────────────────────────────────────────────
-- PHASE 4: Intelligent Summaries
-- ─────────────────────────────────────────────

CREATE TABLE "intelligent_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "summary_type" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "metrics" JSONB NOT NULL,
  "content" TEXT NOT NULL,
  "delivery_channels" TEXT[] NOT NULL,
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "intelligent_summaries_user_id_idx" ON "intelligent_summaries"("user_id");
CREATE INDEX "intelligent_summaries_summary_type_idx" ON "intelligent_summaries"("summary_type");
CREATE INDEX "intelligent_summaries_created_at_idx" ON "intelligent_summaries"("created_at");

-- ─────────────────────────────────────────────
-- PHASE 5: Quick Actions
-- ─────────────────────────────────────────────

CREATE TABLE "quick_actions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "target_type" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "execution_count" INTEGER NOT NULL DEFAULT 0,
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "quick_action_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "action_id" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "error" TEXT,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quick_action_logs_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "quick_actions" ("id") ON DELETE CASCADE
);

CREATE INDEX "quick_actions_user_id_idx" ON "quick_actions"("user_id");
CREATE INDEX "quick_actions_target_type_idx" ON "quick_actions"("target_type");
CREATE INDEX "quick_action_logs_action_id_idx" ON "quick_action_logs"("action_id");
CREATE INDEX "quick_action_logs_executed_at_idx" ON "quick_action_logs"("executed_at");
