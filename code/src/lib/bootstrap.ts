import { registerAuditSubscriptions } from "@/lib/audit";
import { registerAutomationSubscriptions } from "@/modules/automations/automation-subscriptions";

let initialized = false;

/**
 * Application bootstrap — call once at server startup.
 *
 * Registers all event bus subscriptions:
 * 1. Audit subscriptions: auto-log all domain events to the audit trail
 * 2. Automation subscriptions: evaluate and execute automation rules on events
 *
 * Guard against double-initialization (Next.js may call instrumentation
 * register() more than once in development with hot reload).
 */
export function bootstrap(): void {
  if (initialized) return;
  initialized = true;

  registerAuditSubscriptions();
  registerAutomationSubscriptions();
}
