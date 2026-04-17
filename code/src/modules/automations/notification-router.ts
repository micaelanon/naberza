import { eventBus } from "@/lib/events";
import type { ApprovalEvent, AutomationActionEvent } from "@/lib/events/event-types";
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from "./notification.types";

// ─── Message formatters ───────────────────────────────────────────────────────

function formatApprovalRequested(event: ApprovalEvent): NotificationPayload {
  return {
    subject: `Approval required: ${event.ruleName}`,
    body: `Automation rule "${event.ruleName}" (${event.ruleId}) has triggered and requires approval.\nApproval ID: ${event.approvalId}`,
    level: "warning",
    metadata: { approvalId: event.approvalId, ruleId: event.ruleId },
  };
}

function formatApprovalGranted(event: ApprovalEvent): NotificationPayload {
  return {
    subject: `Approval granted: ${event.ruleName}`,
    body: `Automation rule "${event.ruleName}" approval was granted.\nApproval ID: ${event.approvalId}`,
    level: "info",
    metadata: { approvalId: event.approvalId, ruleId: event.ruleId },
  };
}

function formatApprovalDenied(event: ApprovalEvent): NotificationPayload {
  return {
    subject: `Approval denied: ${event.ruleName}`,
    body: `Automation rule "${event.ruleName}" approval was denied.\nApproval ID: ${event.approvalId}`,
    level: "info",
    metadata: { approvalId: event.approvalId, ruleId: event.ruleId },
  };
}

function formatActionFailed(event: AutomationActionEvent): NotificationPayload {
  return {
    subject: `Rule execution failed: ${event.ruleName}`,
    body: `Action "${event.actionType}" in rule "${event.ruleName}" failed.\nError: ${event.error ?? "unknown error"}`,
    level: "critical",
    metadata: { ruleId: event.ruleId, actionType: event.actionType, error: event.error },
  };
}

// ─── NotificationRouter ───────────────────────────────────────────────────────

export class NotificationRouter {
  private readonly channels = new Map<string, NotificationChannel>();

  register(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  unregister(channelId: string): void {
    this.channels.delete(channelId);
  }

  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    for (const channel of this.channels.values()) {
      try {
        const result = await channel.send(payload);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[NotificationRouter] channel "${channel.id}" failed:`, error);
        results.push({ channelId: channel.id, success: false, error: message });
      }
    }
    return results;
  }
}

export const notificationRouter = new NotificationRouter();

// ─── EventBus subscriptions ───────────────────────────────────────────────────

export function registerNotificationSubscriptions(): void {
  eventBus.on("automation.approval.requested", async (event: ApprovalEvent) => {
    await notificationRouter.send(formatApprovalRequested(event));
  });

  eventBus.on("automation.approval.granted", async (event: ApprovalEvent) => {
    await notificationRouter.send(formatApprovalGranted(event));
  });

  eventBus.on("automation.approval.denied", async (event: ApprovalEvent) => {
    await notificationRouter.send(formatApprovalDenied(event));
  });

  eventBus.on("automation.action.executed", async (event: AutomationActionEvent) => {
    if (event.result === "failure") {
      await notificationRouter.send(formatActionFailed(event));
    }
  });
}
