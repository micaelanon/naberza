import { eventBus } from "@/lib/events";
import type { HomeRepository } from "./home.repository";
import type {
  HomeEvent,
  HomeEventSummary,
  ListHomeEventsOptions,
} from "./home.types";

export class HomeService {
  constructor(private readonly repository: HomeRepository) {}

  async getEvent(id: string): Promise<HomeEvent | null> {
    return this.repository.findById(id);
  }

  async listEvents(options: ListHomeEventsOptions = {}): Promise<{
    items: HomeEventSummary[];
    total: number;
  }> {
    const [events, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count({
        entityId: options.entityId,
        severity: options.severity,
        acknowledged: options.acknowledged,
      }),
    ]);

    const items: HomeEventSummary[] = events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      entityId: e.entityId,
      state: e.state,
      severity: e.severity,
      acknowledgedAt: e.acknowledgedAt,
      createdAt: e.createdAt,
    }));

    return { items, total };
  }

  async acknowledgeEvent(id: string): Promise<HomeEvent | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    if (existing.acknowledgedAt) return existing; // already acknowledged — idempotent

    const event = await this.repository.acknowledge(id);

    await eventBus.emit("home.event.received", {
      eventType: event.eventType,
      entityId: event.entityId,
      state: event.state ?? undefined,
      severity: event.severity.toLowerCase() as "info" | "warning" | "critical",
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return event;
  }

  async getPendingCount(): Promise<number> {
    return this.repository.count({ acknowledged: false });
  }
}
