# Naberza OS — Domain Model

## Entity Map

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  InboxItem   │────▶│    Task      │     │   Document   │
│              │────▶│              │     │  (metadata)  │
│              │────▶│              │     └──────┬───────┘
│              │     └──────────────┘            │
│              │                           ┌────┴────┐
│              │────▶┌──────────────┐      │Paperless│
│              │     │   Invoice    │──────│  (ext)  │
│              │     └──────────────┘      └─────────┘
│              │
│              │────▶┌──────────────┐
│              │     │ FinancialEntry│
└──────┬───────┘     └──────────────┘
       │
  ┌────┴────┐        ┌──────────────┐     ┌──────────────┐
  │ Source   │        │  HomeEvent   │◀────│Home Assistant│
  │Connection│        └──────────────┘     │   (ext)      │
  └─────────┘                              └──────────────┘
                     ┌──────────────┐
                     │AutomationRule│──────┌──────────────┐
                     └──────────────┘      │ApprovalRequest│
                                           └──────────────┘
                     ┌──────────────┐
                     │  AuditEvent  │ ◀── all modules write here
                     └──────────────┘
```

## Entities

### InboxItem

**Module**: `inbox`
**Purpose**: Universal entry point. Every external input or manual capture starts here.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | string | Short summary |
| `body` | string? | Full content / raw text |
| `sourceType` | enum | `email`, `paperless`, `home_assistant`, `manual`, `api` |
| `sourceConnectionId` | UUID? | FK to SourceConnection |
| `sourceExternalId` | string? | ID in the external system |
| `sourceRawPayload` | JSON? | Original payload for traceability |
| `classification` | enum | `task`, `document`, `invoice`, `event`, `alert`, `idea`, `financial`, `review` |
| `classifiedBy` | enum | `rule`, `ai_suggestion`, `manual` |
| `classificationConfidence` | float? | AI confidence score |
| `status` | enum | `pending`, `classified`, `routed`, `dismissed`, `failed` |
| `routedToModule` | string? | Target module name |
| `routedToEntityId` | UUID? | Created entity ID in target module |
| `priority` | enum | `high`, `medium`, `low`, `none` |
| `metadata` | JSON? | Flexible metadata bag |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `processedAt` | timestamp? | When classification/routing completed |

**Relations**: → SourceConnection, → (target entity via routedToModule/routedToEntityId)

---

### SourceConnection

**Module**: `integrations`
**Purpose**: Registered external service connection.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | Display name (e.g., "Mi Paperless") |
| `type` | enum | `paperless`, `home_assistant`, `email_imap`, `email_webhook`, `api` |
| `config` | JSON (encrypted) | Connection config (URLs, non-secret settings) |
| `status` | enum | `active`, `inactive`, `error` |
| `lastHealthCheck` | timestamp? | |
| `lastError` | string? | |
| `permissions` | JSON | `{ read: true, write: false }` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Relations**: ← InboxItem

---

### Task

**Module**: `tasks`
**Purpose**: Personal task with priority, scheduling, and recurrence.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | string | |
| `description` | string? | |
| `priority` | enum | `high`, `medium`, `low` |
| `kind` | enum | `normal`, `persistent`, `recurring` |
| `status` | enum | `pending`, `in_progress`, `completed`, `cancelled` |
| `dueAt` | timestamp? | |
| `recurrenceRule` | string? | iCal RRULE format |
| `tags` | string[] | |
| `inboxItemId` | UUID? | FK to originating InboxItem |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `completedAt` | timestamp? | |

**Relations**: → InboxItem (origin)

---

### Document

**Module**: `documents`
**Purpose**: Metadata reference to a document stored externally (Paperless-ngx).

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | string | |
| `externalId` | string | ID in Paperless-ngx |
| `externalUrl` | string? | Direct link |
| `sourceConnectionId` | UUID | FK to SourceConnection |
| `documentType` | enum | `invoice`, `contract`, `receipt`, `letter`, `certificate`, `other` |
| `correspondent` | string? | From Paperless metadata |
| `tags` | string[] | |
| `contentPreview` | string? | First ~200 chars of OCR text |
| `archivedAt` | timestamp? | Paperless archive date |
| `inboxItemId` | UUID? | FK to originating InboxItem |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Relations**: → SourceConnection, → InboxItem, ← Invoice

---

### Invoice

**Module**: `invoices`
**Purpose**: Invoice tracking with payment status.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `issuer` | string | Who issued it |
| `amount` | decimal | Total amount |
| `currency` | string | ISO 4217 (default: EUR) |
| `issueDate` | date | |
| `dueDate` | date? | Payment deadline |
| `status` | enum | `pending`, `paid`, `overdue`, `disputed`, `cancelled` |
| `category` | string? | e.g., "utilities", "subscriptions", "insurance" |
| `isRecurring` | boolean | |
| `documentId` | UUID? | FK to Document |
| `inboxItemId` | UUID? | FK to InboxItem |
| `paidAt` | timestamp? | |
| `notes` | string? | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Relations**: → Document, → InboxItem

---

### FinancialEntry

**Module**: `finance`
**Purpose**: Financial data point — income, expense, balance snapshot, recurring charge.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `type` | enum | `income`, `expense`, `balance_snapshot`, `recurring_charge` |
| `amount` | decimal | |
| `currency` | string | |
| `category` | string? | |
| `description` | string? | |
| `date` | date | |
| `invoiceId` | UUID? | FK to Invoice |
| `isAnomaly` | boolean | Flagged by detection |
| `anomalyReason` | string? | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Relations**: → Invoice

---

### HomeEvent

**Module**: `home`
**Purpose**: Event received from Home Assistant.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `eventType` | string | HA event type |
| `entityId` | string | HA entity ID |
| `state` | string? | Current state |
| `previousState` | string? | |
| `attributes` | JSON? | HA attributes |
| `sourceConnectionId` | UUID | FK to SourceConnection |
| `severity` | enum | `info`, `warning`, `critical` |
| `acknowledgedAt` | timestamp? | |
| `createdAt` | timestamp | |

**Relations**: → SourceConnection

---

### Idea

**Module**: `ideas`
**Purpose**: Quick thought capture for later review.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | string | |
| `body` | string? | |
| `tags` | string[] | |
| `status` | enum | `captured`, `reviewed`, `promoted`, `archived` |
| `promotedToModule` | string? | e.g., "tasks" |
| `promotedToEntityId` | UUID? | |
| `inboxItemId` | UUID? | FK to InboxItem |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Relations**: → InboxItem

---

### AutomationRule

**Module**: `automations`
**Purpose**: Conditional rule that triggers actions on events.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | Human-readable name |
| `description` | string? | |
| `triggerEvent` | string | Event pattern to match |
| `conditions` | JSON | Condition tree |
| `actions` | JSON | Action list |
| `requiresApproval` | boolean | If true, creates ApprovalRequest |
| `enabled` | boolean | |
| `priority` | int | Execution order |
| `lastTriggeredAt` | timestamp? | |
| `executionCount` | int | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

### ApprovalRequest

**Module**: `automations`
**Purpose**: Pending approval for a sensitive automated action.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `automationRuleId` | UUID | FK to AutomationRule |
| `triggerEventPayload` | JSON | What triggered this |
| `proposedActions` | JSON | What would be executed |
| `status` | enum | `pending`, `approved`, `denied`, `expired` |
| `decidedAt` | timestamp? | |
| `expiresAt` | timestamp | Auto-expire safety |
| `reason` | string? | User's reason for decision |
| `createdAt` | timestamp | |

**Relations**: → AutomationRule

---

### AuditEvent

**Module**: `audit`
**Purpose**: Immutable log entry for any significant action.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `module` | string | Source module |
| `action` | string | What happened |
| `entityType` | string? | Entity affected |
| `entityId` | UUID? | |
| `actor` | enum | `user`, `system`, `automation`, `integration` |
| `actorDetail` | string? | Rule name, adapter name, etc. |
| `input` | JSON? | What was received |
| `output` | JSON? | What was produced |
| `status` | enum | `success`, `failure`, `pending` |
| `errorMessage` | string? | |
| `metadata` | JSON? | |
| `createdAt` | timestamp | Immutable |

**Note**: This table is append-only. No updates, no deletes.

---

### UserPreference

**Module**: `users`
**Purpose**: User-specific settings.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | string | Auth user ID |
| `key` | string | Preference key |
| `value` | JSON | Preference value |
| `updatedAt` | timestamp | |

---

## Module Ownership Summary

| Entity | Owning Module |
|---|---|
| InboxItem | inbox |
| SourceConnection | integrations |
| Task | tasks |
| Document | documents |
| Invoice | invoices |
| FinancialEntry | finance |
| HomeEvent | home |
| Idea | ideas |
| AutomationRule | automations |
| ApprovalRequest | automations |
| AuditEvent | audit |
| UserPreference | users |
