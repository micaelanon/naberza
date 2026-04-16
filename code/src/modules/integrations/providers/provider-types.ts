// Shared types used by all provider interfaces

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

export type AdapterErrorCode =
  | "CONNECTION_FAILED"
  | "AUTH_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "EXTERNAL_ERROR"
  | "UNKNOWN";

export class AdapterError extends Error {
  constructor(
    public readonly code: AdapterErrorCode,
    message: string,
    public readonly originalError?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export type ConnectionType =
  | "PAPERLESS"
  | "HOME_ASSISTANT"
  | "EMAIL_IMAP"
  | "EMAIL_WEBHOOK"
  | "API"
  | "CUSTOM";

/**
 * Base interface all adapters implement.
 * When lib/adapters (T3) merges to develop, these will be replaced
 * by imports from @/lib/adapters and this file removed.
 */
export interface BaseAdapter {
  readonly type: ConnectionType;
  readonly connectionId: string;
  testConnection(): Promise<HealthCheckResult>;
  dispose?(): void | Promise<void>;
}

// ─── Shared pagination ─────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Document Provider ────────────────────────────────

export interface DocumentProviderCapabilities {
  canSearch: boolean;
  canUpload: boolean;
  canUpdateMetadata: boolean;
  canOCR: boolean;
  supportsTags: boolean;
  supportsCorrespondents: boolean;
}

export interface DocumentSearchQuery {
  query?: string;
  tags?: string[];
  correspondent?: string;
  documentType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface ExternalDocument {
  externalId: string;
  title: string;
  content?: string;
  correspondent?: string;
  tags: string[];
  documentType?: string;
  created: Date;
  modified: Date;
  originalFileName?: string;
  archiveUrl?: string;
  thumbnailUrl?: string;
}

export interface DocumentMetadata {
  title: string;
  correspondent?: string;
  tags: string[];
  documentType?: string;
  createdDate?: Date;
}

export interface DocumentUpload {
  file: Buffer;
  filename: string;
  title?: string;
  correspondent?: string;
  tags?: string[];
  documentType?: string;
}

export interface DocumentProvider extends BaseAdapter {
  readonly capabilities: DocumentProviderCapabilities;
  search(query: DocumentSearchQuery): Promise<PaginatedResult<ExternalDocument>>;
  getById(externalId: string): Promise<ExternalDocument | null>;
  list(params?: { page?: number; pageSize?: number }): Promise<PaginatedResult<ExternalDocument>>;
  getMetadata(externalId: string): Promise<DocumentMetadata | null>;
  getThumbnail(externalId: string): Promise<Buffer | null>;
  upload(upload: DocumentUpload): Promise<ExternalDocument>;
  updateMetadata(externalId: string, metadata: Partial<DocumentMetadata>): Promise<void>;
  testConnection(): Promise<HealthCheckResult>;
}

// ─── Home Automation Provider ─────────────────────────

export interface HomeProviderCapabilities {
  canReadStates: boolean;
  canReadHistory: boolean;
  canCallServices: boolean;
  canSubscribeEvents: boolean;
  supportedDomains: string[];
}

export type ServiceSafetyLevel = "safe" | "moderate" | "sensitive";

export interface ServiceSafety {
  domain: string;
  service: string;
  level: ServiceSafetyLevel;
  requiresApproval: boolean;
  description: string;
}

export interface EntityState {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: Date;
  lastUpdated: Date;
}

export interface HistoryParams {
  from: Date;
  to?: Date;
}

export interface StateHistoryEntry {
  entityId: string;
  state: string;
  lastChanged: Date;
}

export interface EventListParams {
  eventType?: string;
  from?: Date;
  limit?: number;
}

export interface HomeEventExternal {
  eventType: string;
  entityId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type Unsubscribe = () => void;

export interface HomeAutomationProvider extends BaseAdapter {
  readonly capabilities: HomeProviderCapabilities;
  readonly serviceSafetyMap: ServiceSafety[];
  getStates(): Promise<EntityState[]>;
  getEntityState(entityId: string): Promise<EntityState | null>;
  getHistory(entityId: string, params: HistoryParams): Promise<StateHistoryEntry[]>;
  getEvents(params?: EventListParams): Promise<HomeEventExternal[]>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
  getServiceSafety(domain: string, service: string): ServiceSafety | null;
  subscribeEvents(callback: (event: HomeEventExternal) => void): Promise<Unsubscribe>;
  testConnection(): Promise<HealthCheckResult>;
}

// ─── Mail Provider ────────────────────────────────────

export interface MailProviderCapabilities {
  canFetch: boolean;
  canMarkRead: boolean;
  supportsAttachments: boolean;
  supportsWebhook: boolean;
}

export interface EmailAttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailAttachment extends EmailAttachmentMeta {
  content: Buffer;
}

export interface EmailMessage {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  attachments: EmailAttachmentMeta[];
  headers: Record<string, string>;
  isRead: boolean;
}

export interface FetchMessagesParams {
  since?: Date;
  limit?: number;
  unreadOnly?: boolean;
}

export interface MailProvider extends BaseAdapter {
  readonly capabilities: MailProviderCapabilities;
  fetchNewMessages(params?: FetchMessagesParams): Promise<EmailMessage[]>;
  getMessage(messageId: string): Promise<EmailMessage | null>;
  getAttachment(messageId: string, attachmentId: string): Promise<EmailAttachment>;
  markAsRead(messageId: string): Promise<void>;
  markAsProcessed(messageId: string): Promise<void>;
  testConnection(): Promise<HealthCheckResult>;
}

// ─── Notification Provider ────────────────────────────

export interface NotificationProviderCapabilities {
  supportsRichText: boolean;
  supportsAttachments: boolean;
  supportsActions: boolean;
  maxMessageLength: number;
}

export interface NotificationAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface NotificationAttachment {
  filename: string;
  content: Buffer;
  mimeType: string;
}

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface Notification {
  title: string;
  body: string;
  priority: NotificationPriority;
  module: string;
  entityType?: string;
  entityId?: string;
  actions?: NotificationAction[];
  attachments?: NotificationAttachment[];
}

export interface NotificationResult {
  sent: boolean;
  externalId?: string;
  error?: string;
}

export interface NotificationProvider extends BaseAdapter {
  readonly capabilities: NotificationProviderCapabilities;
  send(notification: Notification): Promise<NotificationResult>;
  testConnection(): Promise<HealthCheckResult>;
}
