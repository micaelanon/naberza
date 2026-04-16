-- clear-seed.sql
-- Elimina los datos de seed sin tocar el schema ni la tabla _prisma_migrations.
-- Usar cuando quieras empezar con datos reales.
--
-- Uso: npx prisma db execute --stdin < prisma/clear-seed.sql
--
-- Orden respeta foreign keys.

TRUNCATE TABLE
  "audit_events",
  "home_events",
  "ideas",
  "automation_rules",
  "approval_requests",
  "financial_entries",
  "invoices",
  "documents",
  "tasks",
  "inbox_items",
  "source_connections",
  "user_preferences",
  "sessions",
  "accounts",
  "verification_tokens"
CASCADE;

-- Keeps: users (no borrar la cuenta de admin)
-- Keeps: _prisma_migrations

SELECT 'Seed data cleared.' AS result;
