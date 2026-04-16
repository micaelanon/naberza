# Naberza OS — Integrations

## Integration Architecture

Every external service is accessed through a **typed adapter** that implements a provider interface. Naberza OS never calls external APIs directly from UI or application logic.

```
Module (use case)
    │
    ▼
Provider Interface (contract)
    │
    ▼
Adapter Implementation (concrete)
    │
    ▼
External Service API
```

## Adapter Registry

All adapters are registered in the `integrations` module's adapter registry. The registry:
- Manages adapter lifecycle (init, health check, shutdown)
- Provides adapters to other modules by type
- Tracks connection health
- Audits all external calls

## Provider Interfaces

### DocumentProvider

**Purpose**: Access external document management systems (Paperless-ngx primary).

```typescript
interface DocumentProvider {
  readonly type: 'paperless' | 'custom';
  readonly capabilities: DocumentProviderCapabilities;

  // Read operations
  search(query: DocumentSearchQuery): Promise<DocumentSearchResult>;
  getById(externalId: string): Promise<ExternalDocument | null>;
  list(params: DocumentListParams): Promise<PaginatedResult<ExternalDocument>>;
  getMetadata(externalId: string): Promise<DocumentMetadata>;
  getThumbnail(externalId: string): Promise<Buffer | null>;

  // Write operations (opt-in, requires permissions.write = true)
  upload(file: DocumentUpload): Promise<ExternalDocument>;
  updateMetadata(externalId: string, metadata: Partial<DocumentMetadata>): Promise<void>;

  // Connection
  testConnection(): Promise<HealthCheckResult>;
}

interface DocumentProviderCapabilities {
  canSearch: boolean;
  canUpload: boolean;
  canUpdateMetadata: boolean;
  canOCR: boolean;
  supportsTags: boolean;
  supportsCorrespondents: boolean;
}

interface DocumentSearchQuery {
  query: string;
  tags?: string[];
  correspondent?: string;
  documentType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

interface ExternalDocument {
  externalId: string;
  title: string;
  content?: string;          // OCR text if available
  correspondent?: string;
  tags: string[];
  documentType?: string;
  created: Date;
  modified: Date;
  originalFileName?: string;
  archiveUrl?: string;
}

interface DocumentUpload {
  file: Buffer;
  filename: string;
  title?: string;
  correspondent?: string;
  tags?: string[];
  documentType?: string;
}
```

**Authentication**: API token via `Authorization: Token <token>` header.
**Error handling**: All methods throw typed `AdapterError` with code, message, and original error.
**Audit**: Every call is logged via audit module with method, params (sanitized), response status, and timing.

---

### HomeAutomationProvider

**Purpose**: Access home automation systems (Home Assistant primary).

```typescript
interface HomeAutomationProvider {
  readonly type: 'home_assistant' | 'custom';
  readonly capabilities: HomeProviderCapabilities;

  // Read operations
  getStates(): Promise<EntityState[]>;
  getEntityState(entityId: string): Promise<EntityState | null>;
  getHistory(entityId: string, params: HistoryParams): Promise<StateHistoryEntry[]>;
  getEvents(params: EventListParams): Promise<HomeEventExternal[]>;

  // Write operations (opt-in, confirmation required for sensitive)
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;

  // Subscription
  subscribeEvents(callback: (event: HomeEventExternal) => void): Promise<Unsubscribe>;

  // Connection
  testConnection(): Promise<HealthCheckResult>;
}

interface HomeProviderCapabilities {
  canReadStates: boolean;
  canReadHistory: boolean;
  canCallServices: boolean;
  canSubscribeEvents: boolean;
  supportedDomains: string[];      // e.g., ['light', 'switch', 'sensor', 'climate']
}

interface EntityState {
  entityId: string;                 // e.g., "sensor.temperature_living_room"
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: Date;
  lastUpdated: Date;
}

interface HomeEventExternal {
  eventType: string;
  entityId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Safety classification for services
interface ServiceSafety {
  domain: string;
  service: string;
  level: 'safe' | 'moderate' | 'sensitive';
  requiresApproval: boolean;
  description: string;
}
```

**Authentication**: Long-lived access token via `Authorization: Bearer <token>` header.
**Error handling**: Typed `AdapterError`. Connection failures trigger health degradation events.
**Audit**: All service calls logged. Read operations logged at debug level. Write operations always logged.
**Safety**: Service calls classified by safety level. `sensitive` actions always require approval.

---

### MailProvider

**Purpose**: Access email for inbox ingestion and document detection.

```typescript
interface MailProvider {
  readonly type: 'imap' | 'webhook' | 'api';
  readonly capabilities: MailProviderCapabilities;

  // Read operations
  fetchNewMessages(since?: Date): Promise<EmailMessage[]>;
  getMessage(messageId: string): Promise<EmailMessage | null>;
  getAttachment(messageId: string, attachmentId: string): Promise<EmailAttachment>;

  // Write operations (limited)
  markAsRead(messageId: string): Promise<void>;
  markAsProcessed(messageId: string): Promise<void>;

  // Connection
  testConnection(): Promise<HealthCheckResult>;
}

interface MailProviderCapabilities {
  canFetch: boolean;
  canMarkRead: boolean;
  supportsAttachments: boolean;
  supportsWebhook: boolean;
}

interface EmailMessage {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;                     // Plain text
  bodyHtml?: string;
  date: Date;
  attachments: EmailAttachmentMeta[];
  headers: Record<string, string>;
  isRead: boolean;
}

interface EmailAttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface EmailAttachment extends EmailAttachmentMeta {
  content: Buffer;
}
```

**Authentication**: IMAP credentials or API key (stored encrypted in SourceConnection config).
**Error handling**: Typed `AdapterError`. IMAP timeouts handled gracefully.
**Audit**: New message fetch logged. Attachment downloads logged.

---

### NotificationProvider

**Purpose**: Send notifications to the user via various channels.

```typescript
interface NotificationProvider {
  readonly type: 'telegram' | 'email' | 'push' | 'webhook';
  readonly capabilities: NotificationProviderCapabilities;

  send(notification: Notification): Promise<NotificationResult>;
  testConnection(): Promise<HealthCheckResult>;
}

interface NotificationProviderCapabilities {
  supportsRichText: boolean;
  supportsAttachments: boolean;
  supportsActions: boolean;         // Inline action buttons
  maxMessageLength: number;
}

interface Notification {
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  module: string;                   // Source module
  entityType?: string;
  entityId?: string;
  actions?: NotificationAction[];
  attachments?: NotificationAttachment[];
}

interface NotificationAction {
  label: string;
  action: string;                   // Action identifier
  payload?: Record<string, unknown>;
}

interface NotificationResult {
  sent: boolean;
  externalId?: string;
  error?: string;
}
```

**Authentication**: Per-provider (Telegram bot token, SMTP credentials, etc.).
**Error handling**: Failed sends logged but never throw to caller (best-effort delivery).
**Audit**: All sends logged with recipient, channel, and result.

---

## Shared Types

```typescript
// All adapters use these shared types

interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

class AdapterError extends Error {
  constructor(
    public readonly code: AdapterErrorCode,
    message: string,
    public readonly originalError?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
  }
}

type AdapterErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'EXTERNAL_ERROR'
  | 'UNKNOWN';

type Unsubscribe = () => void;
```

## Paperless-ngx Integration Details

**API**: REST API v3+ (documented at `<paperless-url>/api/`)
**Base URL**: Configured per SourceConnection
**Auth**: Token-based (`Authorization: Token <token>`)
**Key endpoints used**:
- `GET /api/documents/` — list/search
- `GET /api/documents/{id}/` — get by ID
- `GET /api/documents/{id}/thumb/` — thumbnail
- `GET /api/documents/{id}/download/` — download original
- `POST /api/documents/post_document/` — upload
- `GET /api/correspondents/` — correspondents
- `GET /api/tags/` — tags

**Default permissions**: Read-only. Write (upload) is opt-in.

## Home Assistant Integration Details

**API**: REST API + WebSocket
**Base URL**: Configured per SourceConnection
**Auth**: Long-lived access token
**Key endpoints used**:
- `GET /api/states` — all entity states
- `GET /api/states/{entity_id}` — single entity
- `GET /api/history/period/{timestamp}` — history
- `POST /api/services/{domain}/{service}` — call service
- `WS /api/websocket` — real-time events

**Default permissions**: Read-only for states. Service calls require explicit opt-in + safety classification.

**Service safety defaults**:
| Level | Examples | Approval |
|---|---|---|
| safe | `light.turn_on`, `light.turn_off` | No |
| moderate | `climate.set_temperature`, `switch.toggle` | Configurable |
| sensitive | `lock.unlock`, `alarm_control_panel.disarm` | Always required |

## Email Integration Details

**Protocol**: IMAP (initial), webhook-based later
**Auth**: Username + password or OAuth2 (IMAP), API key (webhook)
**Polling**: Configurable interval (default: 5 minutes)
**Processing flow**:
1. Fetch new messages since last check
2. For each message: create InboxItem with `sourceType: 'email'`
3. Attachments stored temporarily, analyzed for invoice/document detection
4. Mark as processed in source

## Adding New Integrations

1. Define a provider interface in `src/modules/integrations/providers/`
2. Implement the adapter in `src/modules/integrations/adapters/<name>/`
3. Register in the adapter registry
4. Add SourceConnection type enum value
5. Add health check support
6. Document in this file
