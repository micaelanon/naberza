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
  // Helper to extract actor from any event that extends BaseEvent
  function actorFrom(event: BaseEvent) {
    return eventActorToAuditActor(event);
  }

  // Inbox
  auditService.autoLog("inbox.item.created", (e) => ({
    module: "inbox",
    action: "item.created",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: "success",
    input: { title: e.title, sourceType: e.sourceType },
  }));

  auditService.autoLog("inbox.item.classified", (e) => ({
    module: "inbox",
    action: "item.classified",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: "success",
    output: { classification: e.classification, classifiedBy: e.classifiedBy, confidence: e.confidence },
  }));

  auditService.autoLog("inbox.item.routed", (e) => ({
    module: "inbox",
    action: "item.routed",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: "success",
    output: { targetModule: e.targetModule, targetEntityId: e.targetEntityId },
  }));

  auditService.autoLog("inbox.item.dismissed", (e) => ({
    module: "inbox",
    action: "item.dismissed",
    entityType: "InboxItem",
    entityId: e.itemId,
    ...actorFrom(e),
    status: "success",
  }));

  // Tasks
  auditService.autoLog("task.created", (e) => ({
    module: "tasks",
    action: "task.created",
    entityType: "Task",
    entityId: e.taskId,
    ...actorFrom(e),
    status: "success",
    input: { title: e.title },
  }));

  auditService.autoLog("task.completed", (e) => ({
    module: "tasks",
    action: "task.completed",
    entityType: "Task",
    entityId: e.taskId,
    ...actorFrom(e),
    status: "success",
  }));

  // Automations
  auditService.autoLog("automation.rule.matched", (e) => ({
    module: "automations",
    action: "rule.matched",
    entityType: "AutomationRule",
    entityId: e.ruleId,
    ...actorFrom(e),
    status: "success",
    output: { triggerEvent: e.triggerEvent },
  }));

  auditService.autoLog("automation.approval.requested", (e) => ({
    module: "automations",
    action: "approval.requested",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: "pending",
  }));

  auditService.autoLog("automation.approval.granted", (e) => ({
    module: "automations",
    action: "approval.granted",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: "success",
  }));

  auditService.autoLog("automation.approval.denied", (e) => ({
    module: "automations",
    action: "approval.denied",
    entityType: "ApprovalRequest",
    entityId: e.approvalId,
    ...actorFrom(e),
    status: "success",
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

  // Integrations
  auditService.autoLog("integration.connected", (e) => ({
    module: "integrations",
    action: "connected",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: "success",
    output: { connectionType: e.connectionType },
  }));

  auditService.autoLog("integration.disconnected", (e) => ({
    module: "integrations",
    action: "disconnected",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: "success",
  }));

  auditService.autoLog("integration.health.degraded", (e) => ({
    module: "integrations",
    action: "health.degraded",
    entityType: "SourceConnection",
    entityId: e.connectionId,
    ...actorFrom(e),
    status: "failure",
    errorMessage: e.message,
    output: { latencyMs: e.latencyMs, healthy: e.healthy },
  }));
}
