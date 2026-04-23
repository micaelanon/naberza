// Domain event definitions
// Every module declares its events here so the bus is fully typed

export interface DomainEventMap {
  // Inbox events
  "inbox.item.created": InboxItemEvent;
  "inbox.item.classified": InboxItemClassifiedEvent;
  "inbox.item.routed": InboxItemRoutedEvent;
  "inbox.item.dismissed": InboxItemEvent;

  // Task events
  "task.created": TaskEvent;
  "task.completed": TaskEvent;
  "task.overdue": TaskEvent;

  // Document events
  "document.created": DocumentCreatedEvent;
  "document.updated": DocumentUpdatedEvent;
  "document.linked": DocumentEvent;
  "document.uploaded": DocumentEvent;

  // Invoice events
  "invoice.created": InvoiceEvent;
  "invoice.paid": InvoiceEvent;
  "invoice.overdue": InvoiceEvent;
  "invoice.anomaly_detected": InvoiceAnomalyEvent;

  // Finance events
  "finance.entry.created": FinanceEntryEvent;
  "finance.anomaly.detected": FinanceAnomalyEvent;

  // Home events
  "home.event.received": HomeEventReceived;
  "home.action.triggered": HomeActionEvent;
  "home.action.confirmed": HomeActionEvent;

  // Automation events
  "automation.rule.matched": AutomationRuleEvent;
  "automation.approval.requested": ApprovalEvent;
  "automation.approval.granted": ApprovalEvent;
  "automation.approval.denied": ApprovalEvent;
  "automation.action.executed": AutomationActionEvent;

  // Integration events
  "integration.connected": IntegrationEvent;
  "integration.disconnected": IntegrationEvent;
  "integration.health.degraded": IntegrationHealthEvent;

  // User events
  "user.login": UserEvent;
  "user.preference.updated": UserPreferenceEvent;

  // Idea events
  "idea.created": IdeaEvent;
  "idea.promoted": IdeaPromotedEvent;

  // Notification events
  "notification.telegram.registered": TelegramRegisteredEvent;
  "notification.telegram.verified": TelegramVerifiedEvent;
  "notification.telegram.alert.created": TelegramAlertEvent;
  "notification.telegram.alert.updated": TelegramAlertUpdateEvent;
  "notification.telegram.alert.deleted": TelegramAlertEvent;
  "notification.telegram.sent": TelegramMessageEvent;
  "notification.telegram.failed": TelegramMessageFailedEvent;
}

// Base event — all events extend this
export interface BaseEvent {
  timestamp: Date;
  actor: EventActor;
  metadata?: Record<string, unknown>;
}

export type EventActor =
  | { type: "user"; id: string }
  | { type: "system" }
  | { type: "automation"; ruleId: string; ruleName: string }
  | { type: "integration"; connectionId: string; connectionName: string };

// Inbox
export interface InboxItemEvent extends BaseEvent {
  itemId: string;
  title: string;
  sourceType: string;
}

export interface InboxItemClassifiedEvent extends InboxItemEvent {
  classification: string;
  classifiedBy: "rule" | "ai_suggestion" | "manual";
  confidence?: number;
}

export interface InboxItemRoutedEvent extends InboxItemEvent {
  targetModule: string;
  targetEntityId: string;
}

// Task
export interface TaskEvent extends BaseEvent {
  taskId: string;
  title: string;
}

// Document
export interface DocumentCreatedEvent extends BaseEvent {
  documentId: string;
  sourceConnectionId: string;
  externalId: string;
}

export interface DocumentUpdatedEvent extends BaseEvent {
  documentId: string;
  sourceConnectionId: string;
}

export interface DocumentEvent extends BaseEvent {
  documentId: string;
  title: string;
  externalId?: string;
}

// Invoice
export interface InvoiceEvent extends BaseEvent {
  invoiceId: string;
  issuer: string;
  amount: number;
  currency: string;
}

export interface InvoiceAnomalyEvent extends InvoiceEvent {
  anomalyReason: string;
}

// Finance
export interface FinanceEntryEvent extends BaseEvent {
  entryId: string;
  type: string;
  amount: number;
  currency: string;
}

export interface FinanceAnomalyEvent extends FinanceEntryEvent {
  anomalyReason: string;
}

// Home
export interface HomeEventReceived extends BaseEvent {
  eventType: string;
  entityId: string;
  state?: string;
  severity: "info" | "warning" | "critical";
}

export interface HomeActionEvent extends BaseEvent {
  domain: string;
  service: string;
  entityId: string;
}

// Automation
export interface AutomationRuleEvent extends BaseEvent {
  ruleId: string;
  ruleName: string;
  triggerEvent: string;
}

export interface ApprovalEvent extends BaseEvent {
  approvalId: string;
  ruleId: string;
  ruleName: string;
}

export interface AutomationActionEvent extends AutomationRuleEvent {
  actionType: string;
  result: "success" | "failure";
  error?: string;
}

// Integration
export interface IntegrationEvent extends BaseEvent {
  connectionId: string;
  connectionName: string;
  connectionType: string;
}

export interface IntegrationHealthEvent extends IntegrationEvent {
  healthy: boolean;
  latencyMs: number;
  message?: string;
}

// User
export interface UserEvent extends BaseEvent {
  userId: string;
}

export interface UserPreferenceEvent extends UserEvent {
  key: string;
  previousValue?: unknown;
  newValue: unknown;
}

// Idea
export interface IdeaEvent extends BaseEvent {
  ideaId: string;
  title: string;
}

export interface IdeaPromotedEvent extends IdeaEvent {
  targetModule: string;
  targetEntityId: string;
}

// Notification - Telegram
export interface TelegramRegisteredEvent extends BaseEvent {
  userId: string;
  preferenceId: string;
}

export interface TelegramVerifiedEvent extends BaseEvent {
  userId: string;
  telegramUserId: number;
  preferenceId: string;
}

export interface TelegramAlertEvent extends BaseEvent {
  alertId: string;
  triggerType: string;
}

export interface TelegramAlertUpdateEvent extends BaseEvent {
  alertId: string;
  changes: Record<string, unknown>;
}

export interface TelegramMessageEvent extends BaseEvent {
  messageId: string;
  telegramUserId: number;
}

export interface TelegramMessageFailedEvent extends BaseEvent {
  messageId: string;
  error: string;
}

// Utility types for working with the event map
export type DomainEventName = keyof DomainEventMap;
export type DomainEventPayload<T extends DomainEventName> = DomainEventMap[T];
