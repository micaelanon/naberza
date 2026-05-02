// ─── Route paths ───────────────────────────────────────────────────
export const ROUTE_PATHS = {
  HOME: "/home/dashboard",
  TASKS: "/tasks/dashboard",
  INBOX: "/inbox/dashboard",
  INVOICES: "/invoices/dashboard",
  DOCUMENTS: "/documents/dashboard",
  FINANCE: "/finance/dashboard",
  IDEAS: "/ideas/dashboard",
  AUTOMATIONS: "/automations/dashboard",
  INTEGRATIONS: "/integrations/dashboard",
  USERS: "/users/dashboard",
  AUDIT: "/audit/dashboard",
  LOGIN: "/login",
  MAIL_ANALYSIS: "/mail-analysis",
  EMAIL_TRIAGE: "/email-triage/dashboard",
  WISHLIST: "/wishlist/dashboard",
} as const;

// ─── API endpoints (internos) ──────────────────────────────────────
export const API_PATHS = {
  HEALTH: "/api/health",
} as const;

// ─── Keyboard keys ─────────────────────────────────────────────────
export const KEYBOARD_KEYS = {
  ESCAPE: "Escape",
  ENTER: "Enter",
} as const;

// ─── Status values de negocio ──────────────────────────────────────
export const CONNECTION_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
} as const;

export const AUDIT_STATUS = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILURE: "failure",
} as const;

export const HEALTH_STATUS = {
  OK: "ok",
  DEGRADED: "degraded",
  ERROR: "error",
} as const;

// ─── Query cache keys (TanStack Query) ────────────────────────────
export const QUERY_KEYS = {
  tasks: "tasks",
  inbox: "inbox",
  invoices: "invoices",
  documents: "documents",
  finance: "finance",
  ideas: "ideas",
  homeWidgets: "home-widgets",
  automations: "automations",
  integrations: "integrations",
  users: "users",
  health: "health",
} as const;
