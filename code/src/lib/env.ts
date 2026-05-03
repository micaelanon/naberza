// Centralized environment access
// All environment variables are accessed through this module — never use process.env directly in app code

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
  // Database — server only
  databaseUrl: process.env.DATABASE_URL,
  // Auth — server only
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  authAdminEmail: process.env.AUTH_ADMIN_EMAIL,
  authAdminPassword: process.env.AUTH_ADMIN_PASSWORD,
  // API base URL — client safe
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  // Home Assistant — server only
  homeAssistantUrl: process.env.HOME_ASSISTANT_URL,
  homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN,
  // Notification — Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramDefaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID,
  // Notification — SMTP (email)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFromAddress: process.env.SMTP_FROM_ADDRESS ?? "naberza@localhost",
  smtpDefaultTo: process.env.SMTP_DEFAULT_TO,
  // AI — server only
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // Google Vertex AI — server only
  googleServiceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH ?? "./vertex-key.json",
  // Digest — server only
  digestCronToken: process.env.DIGEST_CRON_TOKEN,
} as const;
