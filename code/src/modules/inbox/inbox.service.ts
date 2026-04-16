import { eventBus } from "@/lib/events";
import type { EventBus, EventActor } from "@/lib/events";
import type {
  CreateInboxItemDto,
  InboxFilters,
  InboxItem,
  InboxListResult,
  UpdateInboxItemDto,
} from "./inbox.types";
import type { InboxRepository } from "./inbox.repository";

const SYSTEM_ACTOR: EventActor = { type: "system" };

export class InboxService {
  constructor(
    private readonly repository: InboxRepository,
    private readonly events: EventBus = eventBus
  ) {}

  async getItems(filters: InboxFilters = {}): Promise<InboxListResult> {
    return this.repository.findAll(filters);
  }

  async getItem(id: string): Promise<InboxItem | null> {
    return this.repository.findById(id);
  }

  async createItem(dto: CreateInboxItemDto): Promise<InboxItem> {
    if (!dto.title?.trim()) {
      throw new Error("Inbox item title is required");
    }

    const item = await this.repository.create(dto);

    await this.events.emit("inbox.item.created", {
      timestamp: new Date(),
      actor: SYSTEM_ACTOR,
      itemId: item.id,
      title: item.title,
      sourceType: item.sourceType,
    });

    return item;
  }

  async updateItem(id: string, dto: UpdateInboxItemDto): Promise<InboxItem> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Inbox item not found: ${id}`);
    }

    const item = await this.repository.update(id, dto);

    if (dto.classification) {
      await this.events.emit("inbox.item.classified", {
        timestamp: new Date(),
        actor: SYSTEM_ACTOR,
        itemId: item.id,
        title: item.title,
        sourceType: item.sourceType,
        classification: dto.classification,
        classifiedBy: (dto.classifiedBy?.toLowerCase() ?? "manual") as "rule" | "ai_suggestion" | "manual",
        confidence: dto.classificationConfidence,
      });
    }

    if (dto.routedToModule && dto.routedToEntityId) {
      await this.events.emit("inbox.item.routed", {
        timestamp: new Date(),
        actor: SYSTEM_ACTOR,
        itemId: item.id,
        title: item.title,
        sourceType: item.sourceType,
        targetModule: dto.routedToModule,
        targetEntityId: dto.routedToEntityId,
      });
    }

    return item;
  }

  async dismissItem(id: string): Promise<InboxItem> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Inbox item not found: ${id}`);
    }

    const item = await this.repository.dismiss(id);

    await this.events.emit("inbox.item.dismissed", {
      timestamp: new Date(),
      actor: SYSTEM_ACTOR,
      itemId: item.id,
      title: item.title,
      sourceType: item.sourceType,
    });

    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Inbox item not found: ${id}`);
    }

    await this.repository.delete(id);
  }
}
