// Domain type definitions — kept in sync with prisma/schema.prisma
// These are TypeScript types. Prisma enums are generated at runtime from the schema.

// ─── Shared ───────────────────────────────────

export type Priority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

// ─── Source Connections ───────────────────────

export type ConnectionType =
  | "PAPERLESS"
  | "HOME_ASSISTANT"
  | "EMAIL_IMAP"
  | "EMAIL_WEBHOOK"
  | "API"
  | "CUSTOM";

export type ConnectionStatus = "ACTIVE" | "INACTIVE" | "ERROR";

// ─── Inbox ────────────────────────────────────

export type InboxSourceType =
  | "EMAIL"
  | "PAPERLESS"
  | "HOME_ASSISTANT"
  | "MANUAL"
  | "API";

export type InboxClassification =
  | "TASK"
  | "DOCUMENT"
  | "INVOICE"
  | "EVENT"
  | "ALERT"
  | "IDEA"
  | "FINANCIAL"
  | "REVIEW";

export type ClassifiedBy = "RULE" | "AI_SUGGESTION" | "MANUAL";
export type InboxStatus = "PENDING" | "CLASSIFIED" | "ROUTED" | "DISMISSED" | "FAILED";

// ─── Tasks ────────────────────────────────────

export type TaskKind = "NORMAL" | "PERSISTENT" | "RECURRING";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// ─── Documents ────────────────────────────────

export type DocumentType =
  | "INVOICE"
  | "CONTRACT"
  | "RECEIPT"
  | "LETTER"
  | "CERTIFICATE"
  | "OTHER";

// ─── Invoices ─────────────────────────────────

export type InvoiceStatus = "PENDING" | "PAID" | "OVERDUE" | "DISPUTED" | "CANCELLED";

// ─── Finance ──────────────────────────────────

export type FinancialEntryType =
  | "INCOME"
  | "EXPENSE"
  | "BALANCE_SNAPSHOT"
  | "RECURRING_CHARGE";

// ─── Home ─────────────────────────────────────

export type HomeSeverity = "INFO" | "WARNING" | "CRITICAL";

// ─── Ideas ────────────────────────────────────

export type IdeaStatus = "CAPTURED" | "REVIEWED" | "PROMOTED" | "ARCHIVED";

// ─── Automations ──────────────────────────────

export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";

// ─── Audit ────────────────────────────────────

export type DbAuditActor = "USER" | "SYSTEM" | "AUTOMATION" | "INTEGRATION";
export type DbAuditStatus = "SUCCESS" | "FAILURE" | "PENDING";

// ─── Domain entities (lightweight, DB-agnostic) ──────────

export interface SourceConnectionRecord {
  id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  config: Record<string, unknown>;
  permissionRead: boolean;
  permissionWrite: boolean;
  lastHealthCheck?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InboxItemRecord {
  id: string;
  title: string;
  body?: string;
  sourceType: InboxSourceType;
  sourceConnectionId?: string;
  sourceExternalId?: string;
  sourceRawPayload?: Record<string, unknown>;
  classification?: InboxClassification;
  classifiedBy?: ClassifiedBy;
  classificationConfidence?: number;
  status: InboxStatus;
  routedToModule?: string;
  routedToEntityId?: string;
  priority: Priority;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  kind: TaskKind;
  status: TaskStatus;
  dueAt?: Date;
  recurrenceRule?: string;
  tags: string[];
  inboxItemId?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentRecord {
  id: string;
  title: string;
  externalId: string;
  externalUrl?: string;
  sourceConnectionId: string;
  documentType: DocumentType;
  correspondent?: string;
  tags: string[];
  contentPreview?: string;
  archivedAt?: Date;
  inboxItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRecord {
  id: string;
  issuer: string;
  amount: number;
  currency: string;
  issueDate: Date;
  dueDate?: Date;
  status: InvoiceStatus;
  category?: string;
  isRecurring: boolean;
  documentId?: string;
  inboxItemId?: string;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialEntryRecord {
  id: string;
  type: FinancialEntryType;
  amount: number;
  currency: string;
  category?: string;
  description?: string;
  date: Date;
  invoiceId?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeEventRecord {
  id: string;
  eventType: string;
  entityId: string;
  state?: string;
  previousState?: string;
  attributes?: Record<string, unknown>;
  sourceConnectionId: string;
  severity: HomeSeverity;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface IdeaRecord {
  id: string;
  title: string;
  body?: string;
  tags: string[];
  status: IdeaStatus;
  promotedToModule?: string;
  promotedToEntityId?: string;
  inboxItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationRuleRecord {
  id: string;
  name: string;
  description?: string;
  triggerEvent: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  requiresApproval: boolean;
  enabled: boolean;
  priority: number;
  lastTriggeredAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequestRecord {
  id: string;
  automationRuleId: string;
  triggerEventPayload: Record<string, unknown>;
  proposedActions: Record<string, unknown>[];
  status: ApprovalStatus;
  decidedAt?: Date;
  expiresAt: Date;
  reason?: string;
  createdAt: Date;
}

export interface AuditEventRecord {
  id: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actor: DbAuditActor;
  actorDetail?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: DbAuditStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
