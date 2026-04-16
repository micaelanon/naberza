import { beforeEach, describe, expect, it, vi } from "vitest";

import { InboxService } from "../inbox.service";
import type { InboxRepository } from "../inbox.repository";
import type { InboxItem } from "../inbox.types";

const mockItem: InboxItem = {
  id: "item-1",
  title: "Test item",
  body: "Test body",
  sourceType: "MANUAL",
  sourceConnectionId: null,
  sourceExternalId: null,
  sourceRawPayload: null,
  classification: null,
  classifiedBy: null,
  classificationConfidence: null,
  status: "PENDING",
  routedToModule: null,
  routedToEntityId: null,
  priority: "NONE",
  metadata: null,
  processedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const makeRepository = (overrides: Partial<InboxRepository> = {}): InboxRepository => ({
  findAll: vi.fn().mockResolvedValue({ items: [mockItem], total: 1, page: 1, pageSize: 20 }),
  findById: vi.fn().mockResolvedValue(mockItem),
  create: vi.fn().mockResolvedValue(mockItem),
  update: vi.fn().mockResolvedValue(mockItem),
  dismiss: vi.fn().mockResolvedValue({ ...mockItem, status: "DISMISSED" }),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
} as unknown as InboxRepository);

const makeEventBus = () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
});

describe("InboxService", () => {
  let repository: ReturnType<typeof makeRepository>;
  let events: ReturnType<typeof makeEventBus>;
  let service: InboxService;

  beforeEach(() => {
    repository = makeRepository();
    events = makeEventBus();
    service = new InboxService(repository, events as never);
  });

  describe("getItems", () => {
    it("returns list result from repository", async () => {
      const result = await service.getItems();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });

    it("passes filters to repository", async () => {
      await service.getItems({ status: "PENDING", priority: "HIGH" });
      expect(repository.findAll).toHaveBeenCalledWith({ status: "PENDING", priority: "HIGH" });
    });
  });

  describe("getItem", () => {
    it("returns item by id", async () => {
      const item = await service.getItem("item-1");
      expect(item?.id).toBe("item-1");
      expect(repository.findById).toHaveBeenCalledWith("item-1");
    });

    it("returns null when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new InboxService(repository, events as never);
      const item = await service.getItem("missing");
      expect(item).toBeNull();
    });
  });

  describe("createItem", () => {
    it("creates item and emits event", async () => {
      const item = await service.createItem({ title: "New item", sourceType: "MANUAL" });
      expect(item.id).toBe("item-1");
      expect(repository.create).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith("inbox.item.created", expect.objectContaining({
        itemId: "item-1",
        title: "Test item",
      }));
    });

    it("throws when title is missing", async () => {
      await expect(
        service.createItem({ title: "", sourceType: "MANUAL" })
      ).rejects.toThrow("required");
    });

    it("throws when title is only whitespace", async () => {
      await expect(
        service.createItem({ title: "   ", sourceType: "MANUAL" })
      ).rejects.toThrow("required");
    });
  });

  describe("updateItem", () => {
    it("updates item and emits classified event when classification provided", async () => {
      await service.updateItem("item-1", { classification: "TASK", classifiedBy: "MANUAL" });
      expect(repository.update).toHaveBeenCalledWith("item-1", expect.objectContaining({ classification: "TASK" }));
      expect(events.emit).toHaveBeenCalledWith("inbox.item.classified", expect.objectContaining({
        classification: "TASK",
      }));
    });

    it("emits routed event when routedToModule provided", async () => {
      await service.updateItem("item-1", { routedToModule: "tasks", routedToEntityId: "task-1" });
      expect(events.emit).toHaveBeenCalledWith("inbox.item.routed", expect.objectContaining({
        targetModule: "tasks",
        targetEntityId: "task-1",
      }));
    });

    it("throws when item not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new InboxService(repository, events as never);
      await expect(service.updateItem("missing", { title: "x" })).rejects.toThrow("not found");
    });
  });

  describe("dismissItem", () => {
    it("dismisses item and emits event", async () => {
      const item = await service.dismissItem("item-1");
      expect(item.status).toBe("DISMISSED");
      expect(events.emit).toHaveBeenCalledWith("inbox.item.dismissed", expect.objectContaining({
        itemId: "item-1",
      }));
    });

    it("throws when item not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new InboxService(repository, events as never);
      await expect(service.dismissItem("missing")).rejects.toThrow("not found");
    });
  });

  describe("deleteItem", () => {
    it("deletes item", async () => {
      await service.deleteItem("item-1");
      expect(repository.delete).toHaveBeenCalledWith("item-1");
    });

    it("throws when item not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new InboxService(repository, events as never);
      await expect(service.deleteItem("missing")).rejects.toThrow("not found");
    });
  });
});
