import { AUDIT_STATUS } from "@/lib/constants";
import type { BaseEvent } from "@/lib/events";

import { auditService, eventActorToAuditActor } from "./audit-service";

/**
 * Register automatic audit logging for core domain events.
 * Call this once during application bootstrap.
 *
 * Each event is mapped to an audit entry with:
 * - module: the owning module
 * - action: what happened
 * - entityType + entityId: what was affected
 * - actor: who did it (from event payload)
 * - status: success (events are emitted after successful operations)
 */
export function registerAuditSubscriptions(): void {
  registerInboxSubscriptions();
  registerTaskSubscriptions();
  registerAutomationSubscriptions();
  registerIntegrationSubscriptions();
  registerDocumentSubscriptions();
  registerInvoiceSubscriptions();
  registerFinanceSubscriptions();
  registerHomeSubscriptions();
  registerIdeaSubscriptions();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actorFrom(event: BaseEvent) {
  return eventActorToAuditActor(event);
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

function registerInboxSubscriptions(): void {
  auditService.autoLog("inbox.item.created", (e) => ({
    module: "inbox",
    action: "item.created",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    input: { title: e.title, sourceType: e.sourceType },
  }));

  auditService.autoLog("inbox.item.classified", (e) => ({
    module: "inbox",
    action: "item.classified",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { classification: e.classification, classifiedBy: e.classifiedBy, confidence: e.confidence },
  }));

  auditService.autoLog("inbox.item.routed", (e) => ({
    module: "inbox",
    action: "item.routed",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { targetModule: e.targetModule, targetEntityId: e.targetEntityId },
  }));

  auditService.autoLog("inbox.item.dismissed", (e) => ({
    module: "inbox",
    action: "item.dismissed",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
  }));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function registerTaskSubscriptions(): void {
  auditService.autoLog("task.created", (e) => ({
    module: "tasks",
    action: "task.created",
    entityType: "Task",
    entityId: e.taskId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    input: { title: e.title },
  }));

  auditService.autoLog("task.completed", (e) => ({
    module: "tasks",
    action: "task.completed",
    entityType: "Task",
    entityId: e.taskId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
  }));
}

// ─── Automations ──────────────────────────────────────────────────────────────

function registerAutomationSubscriptions(): void {
  auditService.autoLog("automation.rule.matched", (e) => ({
    module: "automations",
    action: "rule.matched",
    entityType: "AutomationRule",
    entityId: e.ruleId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { triggerEvent: e.triggerEvent },
  }));

  auditService.autoLog("automation.approval.requested", (e) => ({
    module: "automations",
    action: "approval.requested",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: AUDIT_STATUS.PENDING,
  }));

  auditService.autoLog("automation.approval.granted", (e) => ({
    module: "automations",
    action: "approval.granted",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
  }));

  auditService.autoLog("automation.approval.denied", (e) => ({
    module: "automations",
    action: "approval.denied",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
  }));

  auditService.autoLog("automation.action.executed", (e) => ({
    module: "automations",
    action: "action.executed",
    entityType: "AutomationRule",
    entityId: e.ruleId,
    ...actorFrom(e),
    status: e.result === "success" ? "success" : "failure",
    errorMessage: e.error,
    output: { actionType: e.actionType },
  }));
}

// ─── Integrations ─────────────────────────────────────────────────────────────

function registerIntegrationSubscriptions(): void {
  auditService.autoLog("integration.connected", (e) => ({
    module: "integrations",
    action: "connected",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { connectionType: e.connectionType },
  }));

  auditService.autoLog("integration.disconnected", (e) => ({
    module: "integrations",
    action: "disconnected",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
  }));

  auditService.autoLog("integration.health.degraded", (e) => ({
    module: "integrations",
    action: "health.degraded",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: AUDIT_STATUS.FAILURE,
    errorMessage: e.message,
    output: { latencyMs: e.latencyMs, healthy: e.healthy },
  }));
}

// ─── Documents ────────────────────────────────────────────────────────────────

function registerDocumentSubscriptions(): void {
  auditService.autoLog("document.created", (e) => ({
    module: "documents",
    action: "document.created",
    entityType: "Document",
    entityId: e.documentId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { sourceConnectionId: e.sourceConnectionId, externalId: e.externalId },
  }));

  auditService.autoLog("document.updated", (e) => ({
    module: "documents",
    action: "document.updated",
    entityType: "Document",
    entityId: e.documentId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { sourceConnectionId: e.sourceConnectionId },
  }));

  auditService.autoLog("document.linked", (e) => ({
    module: "documents",
    action: "document.linked",
    entityType: "Document",
    entityId: e.documentId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { title: e.title },
  }));

  auditService.autoLog("document.uploaded", (e) => ({
    module: "documents",
    action: "document.uploaded",
    entityType: "Document",
    entityId: e.documentId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { title: e.title },
  }));
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

function registerInvoiceSubscriptions(): void {
  auditService.autoLog("invoice.created", (e) => ({
    module: "invoices",
    action: "invoice.created",
    entityType: "Invoice",
    entityId: e.invoiceId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { issuer: e.issuer, amount: e.amount, currency: e.currency },
  }));

  auditService.autoLog("invoice.paid", (e) => ({
    module: "invoices",
    action: "invoice.paid",
    entityType: "Invoice",
    entityId: e.invoiceId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { issuer: e.issuer, amount: e.amount },
  }));

  auditService.autoLog("invoice.overdue", (e) => ({
    module: "invoices",
    action: "invoice.overdue",
    entityType: "Invoice",
    entityId: e.invoiceId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { issuer: e.issuer, amount: e.amount },
  }));

  auditService.autoLog("invoice.anomaly_detected", (e) => ({
    module: "invoices",
    action: "invoice.anomaly_detected",
    entityType: "Invoice",
    entityId: e.invoiceId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { issuer: e.issuer, anomalyReason: e.anomalyReason },
  }));
}

// ─── Finance ──────────────────────────────────────────────────────────────────

function registerFinanceSubscriptions(): void {
  auditService.autoLog("finance.entry.created", (e) => ({
    module: "finance",
    action: "entry.created",
    entityType: "FinancialEntry",
    entityId: e.entryId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { type: e.type, amount: e.amount, currency: e.currency },
  }));

  auditService.autoLog("finance.anomaly.detected", (e) => ({
    module: "finance",
    action: "anomaly.detected",
    entityType: "FinancialEntry",
    entityId: e.entryId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { anomalyReason: e.anomalyReason },
  }));
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function registerHomeSubscriptions(): void {
  auditService.autoLog("home.event.received", (e) => ({
    module: "home",
    action: "event.received",
    entityType: "HomeEvent",
    entityId: e.entityId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { eventType: e.eventType, severity: e.severity, state: e.state },
  }));
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

function registerIdeaSubscriptions(): void {
  auditService.autoLog("idea.created", (e) => ({
    module: "ideas",
    action: "idea.created",
    entityType: "Idea",
    entityId: e.ideaId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    input: { title: e.title },
  }));

  auditService.autoLog("idea.promoted", (e) => ({
    module: "ideas",
    action: "idea.promoted",
    entityType: "Idea",
    entityId: e.ideaId,
    ...actorFrom(e),
    status: AUDIT_STATUS.SUCCESS,
    output: { targetModule: e.targetModule, targetEntityId: e.targetEntityId },
  }));
}
