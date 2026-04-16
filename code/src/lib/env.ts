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
} as const;
