import { describe, it, expect, vi, beforeEach } from "vitest";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    acknowledge: vi.fn(),
  },
  eventBusMock: { emit: vi.fn() },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { HomeService } from "../home.service";
import type { HomeRepository } from "../home.repository";

const service = new HomeService(repositoryMock as unknown as HomeRepository);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    eventType: "state_changed",
    entityId: "binary_sensor.front_door",
    state: "on",
    previousState: "off",
    attributes: null,
    sourceConnectionId: "conn-ha-1",
    severity: "WARNING" as const,
    acknowledgedAt: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

describe("HomeService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("getEvent", () => {
    it("returns event when found", async () => {
      repositoryMock.findById.mockResolvedValue(makeEvent());
      const result = await service.getEvent("evt-1");
      expect(result?.id).toBe("evt-1");
    });

    it("returns null when not found", async () => {
      repositoryMock.findById.mockResolvedValue(null);
      const result = await service.getEvent("missing");
      expect(result).toBeNull();
    });
  });

  describe("listEvents", () => {
    it("returns items and total", async () => {
      repositoryMock.list.mockResolvedValue([makeEvent()]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listEvents();

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it("maps events to summary shape", async () => {
      repositoryMock.list.mockResolvedValue([makeEvent()]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listEvents();
      const item = result.items[0];

      expect(item).toMatchObject({
        id: "evt-1",
        eventType: "state_changed",
        entityId: "binary_sensor.front_door",
        severity: "WARNING",
        acknowledgedAt: null,
      });
    });

    it("returns empty list when no events", async () => {
      repositoryMock.list.mockResolvedValue([]);
      repositoryMock.count.mockResolvedValue(0);

      const result = await service.listEvents();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("acknowledgeEvent", () => {
    it("returns null when event not found", async () => {
      repositoryMock.findById.mockResolvedValue(null);
      const result = await service.acknowledgeEvent("missing");
      expect(result).toBeNull();
      expect(repositoryMock.acknowledge).not.toHaveBeenCalled();
    });

    it("is idempotent — returns event without re-acknowledging", async () => {
      const alreadyAcked = makeEvent({ acknowledgedAt: new Date() });
      repositoryMock.findById.mockResolvedValue(alreadyAcked);

      const result = await service.acknowledgeEvent("evt-1");

      expect(result?.acknowledgedAt).not.toBeNull();
      expect(repositoryMock.acknowledge).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    });

    it("acknowledges and emits home.event.received", async () => {
      repositoryMock.findById.mockResolvedValue(makeEvent());
      repositoryMock.acknowledge.mockResolvedValue(makeEvent({ acknowledgedAt: new Date() }));

      await service.acknowledgeEvent("evt-1");

      expect(repositoryMock.acknowledge).toHaveBeenCalledWith("evt-1");
      expect(eventBusMock.emit).toHaveBeenCalledWith(
        "home.event.received",
        expect.objectContaining({ entityId: "binary_sensor.front_door", severity: "warning" }),
      );
    });

    it("returns the acknowledged event", async () => {
      repositoryMock.findById.mockResolvedValue(makeEvent());
      const ackedAt = new Date();
      repositoryMock.acknowledge.mockResolvedValue(makeEvent({ acknowledgedAt: ackedAt }));

      const result = await service.acknowledgeEvent("evt-1");

      expect(result?.acknowledgedAt).toEqual(ackedAt);
    });
  });

  describe("getPendingCount", () => {
    it("returns count of unacknowledged events", async () => {
      repositoryMock.count.mockResolvedValue(5);
      const count = await service.getPendingCount();
      expect(count).toBe(5);
      expect(repositoryMock.count).toHaveBeenCalledWith({ acknowledged: false });
    });
  });
});
