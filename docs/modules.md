# Naberza OS — Modules

## Module Map

| Module | Owner of | External Dependencies |
|---|---|---|
| **inbox** | InboxItem lifecycle, ingestion, classification | Adapters (mail, paperless, HA) |
| **tasks** | Task CRUD, status, assignment | — |
| **documents** | Document metadata, linking to external docs | Paperless adapter |
| **invoices** | Invoice detection, tracking, payment status | Paperless adapter, mail adapter |
| **finance** | Financial entries, recurring charges, anomaly detection | — |
| **home** | Home events, device states, dashboard cards | Home Assistant adapter |
| **ideas** | Idea capture, tagging, review queue | — |
| **automations** | Rule definitions, execution, approval flow | All modules (reads) |
| **integrations** | Adapter registry, health checks, config | External APIs |
| **audit** | Audit event logging, querying, retention | All modules (writes) |
| **users** | Authentication, preferences, settings | — |

## Module Detail

### inbox

**Purpose**: Universal entry point for all incoming items. Everything enters through the inbox before being routed.

**Owns**:
- `InboxItem` entity
- Ingestion pipeline
- Classification logic
- Routing rules

**Key operations**:
- Create item (manual or via adapter)
- Classify item (rule-based or AI-suggested)
- Route item to target module
- Mark as reviewed / dismissed

**Events emitted**:
- `inbox.item.created`
- `inbox.item.classified`
- `inbox.item.routed`
- `inbox.item.dismissed`

---

### tasks

**Purpose**: Personal task management with priorities, dates, and persistent/recurring tasks.

**Owns**:
- `Task` entity
- Task views (today, upcoming, persistent, completed)
- Task creation from inbox routing

**Key operations**:
- CRUD
- Toggle completion
- Set priority / due date
- Link to source inbox item

**Events emitted**:
- `task.created`
- `task.completed`
- `task.overdue`

---

### documents

**Purpose**: Document metadata layer. Does NOT store documents — delegates to Paperless-ngx.

**Owns**:
- `Document` entity (metadata + external reference)
- Link between internal entities and external documents

**Key operations**:
- Search documents (via Paperless)
- Link document to invoice/task/inbox item
- View document metadata
- Upload to Paperless

**Events emitted**:
- `document.linked`
- `document.uploaded`

---

### invoices

**Purpose**: Invoice tracking — detection, amount, status, payment tracking.

**Owns**:
- `Invoice` entity
- Invoice detection from inbox items
- Payment status tracking

**Key operations**:
- Create from inbox item or manual
- Link to document (Paperless)
- Mark payment status
- Flag anomalies

**Events emitted**:
- `invoice.created`
- `invoice.paid`
- `invoice.overdue`
- `invoice.anomaly_detected`

---

### finance

**Purpose**: Financial overview — recurring charges, balances, anomaly detection.

**Owns**:
- `FinancialEntry` entity
- `InvestmentNote` entity (lightweight tracking, not execution)
- Recurring charge detection
- Financial summaries

**Key operations**:
- Log entry (manual or from invoice)
- Detect recurring patterns
- Flag anomalous charges
- Generate period summaries

**Events emitted**:
- `finance.entry.created`
- `finance.anomaly.detected`
- `finance.summary.generated`

---

### home

**Purpose**: Home automation visibility and safe control through Home Assistant.

**Owns**:
- `HomeEvent` entity (event log from HA)
- Dashboard widgets for home state
- Safe action triggers

**Key operations**:
- Receive events from Home Assistant
- Display device states
- Trigger safe actions (with confirmation)
- Show relevant events on dashboard

**Events emitted**:
- `home.event.received`
- `home.action.triggered`
- `home.action.confirmed`

---

### ideas

**Purpose**: Quick idea capture with optional tagging and review queue.

**Owns**:
- `Idea` entity
- Review queue
- Tagging

**Key operations**:
- Quick capture
- Tag / categorize
- Promote to task or project
- Archive / dismiss

**Events emitted**:
- `idea.created`
- `idea.promoted`

---

### automations

**Purpose**: Rule engine for automated responses to events and inbox items.

**Owns**:
- `AutomationRule` entity
- `ApprovalRequest` entity
- Rule evaluation engine
- Approval workflow

**Key operations**:
- Define rules (condition → action)
- Evaluate rules against events
- Request approval for sensitive actions
- Execute approved actions
- Log all rule executions

**Events emitted**:
- `automation.rule.matched`
- `automation.approval.requested`
- `automation.approval.granted`
- `automation.approval.denied`
- `automation.action.executed`

---

### integrations

**Purpose**: Adapter registry and lifecycle management for external services.

**Owns**:
- `SourceConnection` entity
- Adapter interfaces
- Health check logic
- Connection configuration

**Key operations**:
- Register / configure connection
- Test connection health
- Enable / disable adapter
- List available integrations

**Events emitted**:
- `integration.connected`
- `integration.disconnected`
- `integration.health.degraded`

---

### audit

**Purpose**: Immutable log of all significant system actions.

**Owns**:
- `AuditEvent` entity
- Query/filter interface
- Retention policies

**Key operations**:
- Log event (called by all modules)
- Query events (by module, entity, time range, actor)
- Export audit trail

**Events emitted**: None (terminal module — only receives)

---

### users

**Purpose**: Authentication, session management, and user preferences.

**Owns**:
- User session
- `UserPreference` entity
- Auth flow

**Key operations**:
- Login / logout
- Update preferences (timezone, language, notification settings)
- Manage API keys for integrations

**Events emitted**:
- `user.login`
- `user.preference.updated`

## Inter-Module Communication

Modules interact through:

1. **Domain events** (async, via typed event bus):
   - `audit` subscribes to all events
   - `automations` evaluates rules against events
   - `inbox` routing triggers target module creation

2. **Direct service imports** (sync, for queries):
   - Only through public module interfaces (`modules/<name>/index.ts`)
   - Never cross-module database queries

3. **Shared infrastructure**:
   - Prisma client (shared, but each module queries its own tables)
   - Auth middleware (shared)
   - Logging (shared)
