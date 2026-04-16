# Naberza OS — Security

## Principles

1. **Least privilege by default**: Every integration starts read-only. Write permissions are opt-in.
2. **No secrets in code**: All credentials in environment variables. Never in client bundle.
3. **Audit everything sensitive**: Every write, delete, external call, and approval is logged.
4. **AI suggests, user decides**: AI can classify, summarize, and detect. It cannot execute sensitive actions autonomously.
5. **Explicit approval for dangerous actions**: Defined per-action sensitivity level.

## Authentication

- **Method**: NextAuth.js (Auth.js v5)
- **Initial mode**: Single-user with email/password or magic link
- **Session**: JWT-based, httpOnly cookie
- **API routes**: All authenticated via middleware
- **Public routes**: None (except login page)

## Authorization

| Action | Level | Approval Required |
|---|---|---|
| Read dashboard, inbox, tasks | Authenticated | No |
| Create task, idea, note | Authenticated | No |
| Classify inbox item | Authenticated | No |
| Delete item | Authenticated | Soft-delete only, hard-delete needs confirmation |
| Configure integration | Authenticated | No |
| Enable write on integration | Authenticated | Explicit opt-in |
| Upload to Paperless | Authenticated + write permission | No |
| Call HA service (safe) | Authenticated | No |
| Call HA service (moderate) | Authenticated | Configurable |
| Call HA service (sensitive) | Authenticated | Always |
| Execute automation rule | System | Depends on rule config |
| Approve/deny request | Authenticated | N/A |
| Export data | Authenticated | No |
| Delete audit events | NEVER | — |

## Secrets Management

| Secret | Storage | Access |
|---|---|---|
| Database URL | `DATABASE_URL` env var | Server only |
| NextAuth secret | `NEXTAUTH_SECRET` env var | Server only |
| Paperless API token | Encrypted in SourceConnection | Server only, via adapter |
| Home Assistant token | Encrypted in SourceConnection | Server only, via adapter |
| IMAP credentials | Encrypted in SourceConnection | Server only, via adapter |
| Telegram bot token | `TELEGRAM_BOT_TOKEN` env var | Server only |

**SourceConnection config encryption**: AES-256-GCM with key derived from `ENCRYPTION_KEY` env var.

## API Security

- All API routes behind auth middleware
- CSRF protection via Next.js SameSite cookie defaults
- Rate limiting on ingestion endpoints (configurable)
- Input validation on all mutations (Zod schemas)
- No raw SQL — Prisma parameterized queries only
- Response sanitization — no internal IDs or stack traces in error responses

## External Integration Security

- **Default mode**: Read-only
- **Write opt-in**: User must explicitly enable per-connection
- **Token rotation**: Reminder to rotate tokens periodically (logged in audit)
- **Health checks**: Detect degraded connections early
- **Timeout**: All external calls have configurable timeouts (default: 10s)
- **Retry**: Retryable errors get max 3 attempts with exponential backoff
- **Circuit breaker**: After N consecutive failures, adapter is paused (manual re-enable)

## AI Safety

| AI Action | Allowed | Requires Approval |
|---|---|---|
| Classify inbox item | ✅ | No (suggestion, user confirms) |
| Suggest task priority | ✅ | No |
| Detect invoice in email | ✅ | No |
| Summarize document | ✅ | No |
| Detect anomalous charge | ✅ | No |
| Auto-route inbox item | ✅ | Configurable |
| Delete anything | ❌ | — |
| Move money | ❌ | — |
| Execute HA sensitive service | ❌ | — |
| Send notification without trace | ❌ | — |

## Audit Trail Requirements

Every AuditEvent must contain:
1. **What**: action type, entity type, entity ID
2. **Who**: actor (user, system, automation, integration)
3. **When**: immutable timestamp
4. **Where**: source module
5. **Why**: rule name or trigger (for automated actions)
6. **Result**: success/failure, error message if failed

Audit events are **append-only**. No updates. No deletes. Ever.

Retention: configurable, default 1 year. Archived events can be exported.

## Data Protection

- All data at rest in PostgreSQL (encryption at DB level recommended)
- Passwords hashed with bcrypt (via NextAuth)
- Session tokens are JWTs with short expiry
- No PII in logs (sanitize before logging)
- File uploads: validate MIME type, max size limits, virus scan (future)
