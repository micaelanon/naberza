import type { DomainEventName, DomainEventPayload } from "@/lib/events";
import { eventBus } from "@/lib/events";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { AutomationService } from "@/modules/automations/automation.service";

const repository = new AutomationRepository();
const service = new AutomationService(repository);

/**
 * Subscribe the automation engine to all domain events.
 *
 * When any domain event fires, we check whether enabled automation rules
 * are configured for that event and evaluate + dispatch them.
 *
 * The payload is cast to Record<string, unknown> so the evaluator can
 * navigate it with dot-notation field paths.
 */
export function registerAutomationSubscriptions(): void {
  const domainEvents: DomainEventName[] = [
    // Inbox
    "inbox.item.created",
    "inbox.item.classified",
    "inbox.item.routed",
    "inbox.item.dismissed",
    // Tasks
    "task.created",
    "task.completed",
    "task.overdue",
    // Documents
    "document.created",
    "document.updated",
    "document.linked",
    "document.uploaded",
    // Invoices
    "invoice.created",
    "invoice.paid",
    "invoice.overdue",
    "invoice.anomaly_detected",
    // Finance
    "finance.entry.created",
    "finance.anomaly.detected",
    // Home
    "home.event.received",
    "home.action.triggered",
    "home.action.confirmed",
    // Ideas
    "idea.created",
    "idea.promoted",
    // Integrations
    "integration.connected",
    "integration.disconnected",
    "integration.health.degraded",
  ];

  for (const eventName of domainEvents) {
    eventBus.on(eventName, async (payload: DomainEventPayload<typeof eventName>) => {
      await service.processEvent(eventName, payload as unknown as Record<string, unknown>);
    });
  }
}
