-- Fix 20260421000000_add_email_advanced_features
-- The original migration created several enum-backed Prisma fields as plain TEXT,
-- which breaks runtime inserts because Prisma casts to PostgreSQL enum types.

-- Create missing enum types if they do not exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertTriggerType') THEN
    CREATE TYPE "AlertTriggerType" AS ENUM (
      'PRIORITY_SENDER',
      'KEYWORD',
      'UNPAID_INVOICE',
      'URGENT_TASK',
      'FINANCE_SUMMARY',
      'DAILY_DIGEST',
      'WEEKLY_DIGEST'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM (
      'PENDING',
      'SENT',
      'DELIVERED',
      'FAILED',
      'BOUNCED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CleanupMatchType') THEN
    CREATE TYPE "CleanupMatchType" AS ENUM (
      'SENDER',
      'KEYWORD',
      'NEWSLETTER',
      'OLD_EMAILS',
      'SIZE_THRESHOLD',
      'READ_STATUS',
      'CUSTOM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CleanupAction') THEN
    CREATE TYPE "CleanupAction" AS ENUM (
      'DELETE',
      'ARCHIVE',
      'LABEL',
      'MOVE_TO_FOLDER'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExtractionMethod') THEN
    CREATE TYPE "ExtractionMethod" AS ENUM (
      'OCR',
      'STRUCTURED_PDF',
      'AI_VISION',
      'MANUAL'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExtractionStatus') THEN
    CREATE TYPE "ExtractionStatus" AS ENUM (
      'PENDING',
      'IN_PROGRESS',
      'SUCCESS',
      'FAILED',
      'MANUAL_REVIEW'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SummaryType') THEN
    CREATE TYPE "SummaryType" AS ENUM (
      'DAILY',
      'WEEKLY',
      'MONTHLY'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuickActionTargetType') THEN
    CREATE TYPE "QuickActionTargetType" AS ENUM (
      'EMAIL',
      'INVOICE',
      'TASK',
      'DOCUMENT',
      'IDEA',
      'BATCH'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionResult') THEN
    CREATE TYPE "ActionResult" AS ENUM (
      'SUCCESS',
      'FAILURE',
      'PARTIAL'
    );
  END IF;
END
$$;

-- Convert TEXT columns to enum-backed columns expected by Prisma
ALTER TABLE "telegram_alerts"
  ALTER COLUMN "trigger_type" TYPE "AlertTriggerType" USING ("trigger_type"::"AlertTriggerType");

ALTER TABLE "telegram_messages"
  ALTER COLUMN "status" TYPE "MessageStatus" USING ("status"::"MessageStatus");

ALTER TABLE "email_cleanup_rules"
  ALTER COLUMN "match_type" TYPE "CleanupMatchType" USING ("match_type"::"CleanupMatchType"),
  ALTER COLUMN "action" TYPE "CleanupAction" USING ("action"::"CleanupAction");

ALTER TABLE "email_cleanup_logs"
  ALTER COLUMN "action" TYPE "CleanupAction" USING ("action"::"CleanupAction");

ALTER TABLE "invoice_extraction_logs"
  ALTER COLUMN "extraction_method" TYPE "ExtractionMethod" USING ("extraction_method"::"ExtractionMethod"),
  ALTER COLUMN "status" TYPE "ExtractionStatus" USING ("status"::"ExtractionStatus");

ALTER TABLE "intelligent_summaries"
  ALTER COLUMN "summary_type" TYPE "SummaryType" USING ("summary_type"::"SummaryType");

ALTER TABLE "quick_actions"
  ALTER COLUMN "target_type" TYPE "QuickActionTargetType" USING ("target_type"::"QuickActionTargetType");

ALTER TABLE "quick_action_logs"
  ALTER COLUMN "result" TYPE "ActionResult" USING ("result"::"ActionResult");

-- Add missing foreign keys that the Prisma schema expects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'email_cleanup_rules_user_id_fkey'
  ) THEN
    ALTER TABLE "email_cleanup_rules"
      ADD CONSTRAINT "email_cleanup_rules_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'intelligent_summaries_user_id_fkey'
  ) THEN
    ALTER TABLE "intelligent_summaries"
      ADD CONSTRAINT "intelligent_summaries_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'quick_actions_user_id_fkey'
  ) THEN
    ALTER TABLE "quick_actions"
      ADD CONSTRAINT "quick_actions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END
$$;
