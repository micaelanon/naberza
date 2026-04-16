import { eventBus } from "@/lib/events";
import type { DomainEventName, DomainEventPayload, BaseEvent } from "@/lib/events";

import type { AuditStore } from "./audit-store";
import { InMemoryAuditStore } from "./audit-store";
import type { AuditActor, AuditQueryParams, AuditQueryResult, CreateAuditEntry, AuditEntry } from "./audit-types";

/**
 * Audit service — records all significant system actions.
 *
 * Design:
 * - Append-only: entries are never updated or deleted
 * - Every module calls audit.log() for important operations
 * - The service also auto-subscribes to domain events for passive auditing
 * - Store is injectable (in-memory for dev/test, Prisma for production)
 */
class AuditService {
  private store: AuditStore;

  constructor(store?: AuditStore) {
    this.store = store ?? new InMemoryAuditStore();
  }

  /**
   * Log an audit event directly. Use this from module services
   * for explicit audit logging of important operations.
   */
  async log(entry: CreateAuditEntry): Promise<AuditEntry> {
    return this.store.append(entry);
  }

  /**
   * Query audit entries with filters and pagination.
   */
  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    return this.store.query(params);
  }

  /**
   * Count audit entries matching filters.
   */
  async count(params?: Omit<AuditQueryParams, "page" | "pageSize">): Promise<number> {
    return this.store.count(params);
  }

  /**
   * Subscribe to a domain event and automatically log it as an audit entry.
   * This provides passive auditing — modules don't need to explicitly log
   * events that are already emitted through the event bus.
   */
  autoLog<T extends DomainEventName>(
    event: T,
    mapper: (payload: DomainEventPayload<T>) => CreateAuditEntry
  ): void {
    eventBus.on(event, async (payload) => {
      try {
        await this.log(mapper(payload));
      } catch (error) {
        console.error(`[AuditService] Failed to auto-log event "${event}":`, error);
      }
    });
  }

  /**
   * Replace the audit store. Useful for switching from in-memory to Prisma
   * after database initialization.
   */
  setStore(store: AuditStore): void {
    this.store = store;
  }
}

/**
 * Extract actor info from a BaseEvent for audit logging.
 */
export function eventActorToAuditActor(event: BaseEvent): { actor: AuditActor; actorDetail?: string } {
  switch (event.actor.type) {
    case "user":
      return { actor: "user", actorDetail: event.actor.id };
    case "system":
      return { actor: "system" };
    case "automation":
      return { actor: "automation", actorDetail: event.actor.ruleName };
    case "integration":
      return { actor: "integration", actorDetail: event.actor.connectionName };
  }
}

// Singleton instance
export const auditService = new AuditService();

// Export class for testing
export { AuditService };
