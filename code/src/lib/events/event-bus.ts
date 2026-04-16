import type { DomainEventMap, DomainEventName, DomainEventPayload } from "./event-types";

type EventHandler<T extends DomainEventName> = (payload: DomainEventPayload<T>) => void | Promise<void>;

interface Subscription {
  unsubscribe: () => void;
}

/**
 * In-process typed event bus for inter-module communication.
 *
 * Design decisions:
 * - Synchronous dispatch by default (handlers run in sequence)
 * - Async handlers are awaited — errors are caught and logged, never propagate to emitter
 * - Subscribers are called in registration order
 * - No persistence — events are fire-and-forget within the request lifecycle
 * - Can be replaced with a message broker later if needed
 */
class EventBus {
  private handlers = new Map<string, Array<{ id: number; handler: EventHandler<DomainEventName> }>>();
  private nextId = 0;

  /**
   * Subscribe to a domain event.
   * Returns a Subscription object with an unsubscribe method.
   */
  on<T extends DomainEventName>(event: T, handler: EventHandler<T>): Subscription {
    const id = this.nextId++;
    const existing = this.handlers.get(event) ?? [];
    existing.push({ id, handler: handler as EventHandler<DomainEventName> });
    this.handlers.set(event, existing);

    return {
      unsubscribe: () => {
        const current = this.handlers.get(event);
        if (current) {
          this.handlers.set(
            event,
            current.filter((h) => h.id !== id)
          );
        }
      },
    };
  }

  /**
   * Emit a domain event. All registered handlers are invoked.
   * Async handlers are awaited. Errors are caught and logged — they never
   * propagate back to the emitter to prevent one bad subscriber from
   * breaking the emitting module.
   */
  async emit<T extends DomainEventName>(event: T, payload: DomainEventPayload<T>): Promise<void> {
    const subscribers = this.handlers.get(event);
    if (!subscribers || subscribers.length === 0) return;

    for (const { handler } of subscribers) {
      try {
        await handler(payload as DomainEventMap[DomainEventName]);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    }
  }

  /**
   * Remove all handlers. Useful for testing teardown.
   */
  clear(): void {
    this.handlers.clear();
    this.nextId = 0;
  }

  /**
   * Get the count of registered handlers for an event. Useful for diagnostics.
   */
  listenerCount(event: DomainEventName): number {
    return this.handlers.get(event)?.length ?? 0;
  }
}

// Singleton instance — shared across the entire application
export const eventBus = new EventBus();

// Export class for testing
export { EventBus };

// Re-export types for convenience
export type { DomainEventMap, DomainEventName, DomainEventPayload, Subscription };
