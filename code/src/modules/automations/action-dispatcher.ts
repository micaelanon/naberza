import type { ActionType, RuleAction, ActionExecutionResult } from "./automation.types";
import type { Priority as TaskPriority } from "@/modules/tasks/task.types";
import type { InboxSourceType } from "@/modules/inbox/inbox.types";

// ─── Handler contract ─────────────────────────────────────────────────────────

type ActionHandler = (
  params: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
) => Promise<unknown>;

// ─── Service factories ────────────────────────────────────────────────────────
// Lazy instantiation via dynamic import avoids circular imports and
// allows test overrides.

async function getTaskService() {
  const { TaskRepository } = await import("@/modules/tasks/task.repository");
  const { TaskService } = await import("@/modules/tasks/task.service");
  return new TaskService(new TaskRepository());
}

async function getInboxService() {
  const { InboxRepository } = await import("@/modules/inbox/inbox.repository");
  const { InboxService } = await import("@/modules/inbox/inbox.service");
  return new InboxService(new InboxRepository());
}

async function getInvoiceService() {
  const { InvoiceRepository } = await import("@/modules/invoices/invoice.repository");
  const { InvoiceService } = await import("@/modules/invoices/invoice.service");
  return new InvoiceService(new InvoiceRepository());
}

async function getFinanceService() {
  const { FinanceRepository } = await import("@/modules/finance/finance.repository");
  const { FinanceService } = await import("@/modules/finance/finance.service");
  return new FinanceService(new FinanceRepository());
}

async function getIdeasService() {
  const { IdeasRepository } = await import("@/modules/ideas/ideas.repository");
  const { IdeasService } = await import("@/modules/ideas/ideas.service");
  return new IdeasService(new IdeasRepository());
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleCreateTask(
  params: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
): Promise<unknown> {
  const service = await getTaskService();
  const priority = typeof params.priority === "string"
    ? params.priority as TaskPriority
    : "MEDIUM" as TaskPriority;
  return service.createTask({
    title: String(params.title ?? `Automated task from ${eventPayload.eventName ?? "event"}`),
    description: typeof params.description === "string" ? params.description : undefined,
    priority,
  });
}

async function handleCreateInboxItem(
  params: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
): Promise<unknown> {
  const service = await getInboxService();
  const sourceType: InboxSourceType = typeof params.sourceType === "string"
    ? params.sourceType as InboxSourceType
    : "API";
  return service.createItem({
    title: String(params.title ?? "Automated inbox item"),
    sourceType,
    body: typeof params.body === "string" ? params.body : JSON.stringify(eventPayload),
  });
}

async function handleSendNotification(
  params: Record<string, unknown>,
): Promise<unknown> {
  // Notification adapters (Telegram, Email) will be implemented in P5-05.
  console.info("[ActionDispatcher] send_notification:", params);
  return { sent: false, reason: "notification adapters not yet implemented" };
}

async function handleMarkInvoicePaid(
  params: Record<string, unknown>,
): Promise<unknown> {
  const invoiceId = String(params.invoiceId ?? "");
  if (!invoiceId) throw new Error("mark_invoice_paid requires params.invoiceId");
  const service = await getInvoiceService();
  const result = await service.markPaid(invoiceId);
  if (!result) throw new Error(`Invoice ${invoiceId} not found`);
  return result;
}

async function handleFlagFinanceAnomaly(
  params: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
): Promise<unknown> {
  const entryId = String(params.entryId ?? eventPayload.entryId ?? "");
  const reason = String(params.reason ?? "Flagged by automation rule");
  if (!entryId) throw new Error("flag_finance_anomaly requires params.entryId or event payload entryId");
  const service = await getFinanceService();
  const result = await service.flagAnomaly(entryId, reason);
  if (!result) throw new Error(`FinancialEntry ${entryId} not found`);
  return result;
}

async function handleArchiveIdea(
  params: Record<string, unknown>,
): Promise<unknown> {
  const ideaId = String(params.ideaId ?? "");
  if (!ideaId) throw new Error("archive_idea requires params.ideaId");
  const service = await getIdeasService();
  const result = await service.archiveIdea(ideaId);
  if (!result) throw new Error(`Idea ${ideaId} not found`);
  return result;
}

async function handleWebhookCall(
  params: Record<string, unknown>,
  eventPayload: Record<string, unknown>,
): Promise<unknown> {
  const url = String(params.url ?? "");
  if (!url) throw new Error("webhook_call requires params.url");
  const method = typeof params.method === "string" ? params.method : "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(typeof params.headers === "object" && params.headers !== null
      ? (params.headers as Record<string, string>)
      : {}),
  };
  const body = JSON.stringify({
    event: eventPayload,
    params,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(url, { method, headers, body });
  return { status: response.status, ok: response.ok };
}

// ─── Handler registry ─────────────────────────────────────────────────────────

const HANDLERS: Record<ActionType, ActionHandler> = {
  create_task: handleCreateTask,
  create_inbox_item: handleCreateInboxItem,
  send_notification: handleSendNotification,
  mark_invoice_paid: handleMarkInvoicePaid,
  flag_finance_anomaly: handleFlagFinanceAnomaly,
  archive_idea: handleArchiveIdea,
  webhook_call: handleWebhookCall,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Dispatch a rule action to its corresponding handler.
 *
 * Returns ActionExecutionResult with success/failure and optional output/error.
 * Errors are caught — a failing action never propagates to the caller.
 */
export async function dispatchAction(
  action: RuleAction,
  eventPayload: Record<string, unknown>,
): Promise<ActionExecutionResult> {
  const handler = HANDLERS[action.type];
  if (!handler) {
    return { action, success: false, error: `Unknown action type: ${action.type}` };
  }

  try {
    const output = await handler(action.params, eventPayload);
    return { action, success: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ActionDispatcher] ${action.type} failed:`, error);
    return { action, success: false, error: message };
  }
}
