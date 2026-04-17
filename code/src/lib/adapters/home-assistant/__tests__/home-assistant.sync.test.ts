import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { prismaMock, eventBusMock, haAdapterMock } = vi.hoisted(() => ({
  prismaMock: {
    inboxItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  eventBusMock: {
    emit: vi.fn(),
  },
  haAdapterMock: {
    connectionId: "conn-ha-1",
    type: "home_assistant" as const,
    getStates: vi.fn(),
    getMonitoredDomains: vi.fn(),
    getDomain: vi.fn(),
    isNotableState: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { syncHomeAssistantAlerts } from "../home-assistant.sync";
import type { HomeAssistantAdapter } from "../home-assistant.adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeState(entityId: string, state = "on", overrides: Record<string, unknown> = {}) {
  return {
    entity_id: entityId,
    state,
    attributes: {},
    last_changed: "2026-01-01T12:00:00Z",
    last_updated: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

const adapter = haAdapterMock as unknown as HomeAssistantAdapter;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("syncHomeAssistantAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    haAdapterMock.getMonitoredDomains.mockReturnValue(["binary_sensor", "alarm_control_panel"]);
    haAdapterMock.getDomain.mockImplementation((entityId: string) => entityId.split(".")[0]);
    haAdapterMock.isNotableState.mockReturnValue(true);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Alert: Motion" });
    eventBusMock.emit.mockResolvedValue(undefined);
  });

  it("returns zeroed result when no states", async () => {
    haAdapterMock.getStates.mockResolvedValue([]);

    const result = await syncHomeAssistantAlerts(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("filters out states from unmonitored domains", async () => {
    haAdapterMock.getStates.mockResolvedValue([
      makeState("sensor.temperature", "22"),
      makeState("binary_sensor.motion", "on"),
    ]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Alert: Motion" });

    const result = await syncHomeAssistantAlerts(adapter);

    expect(result).toEqual({ synced: 1, skipped: 0, errors: 0 });
    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.sourceType).toBe("HOME_ASSISTANT");
  });

  it("filters out non-notable states", async () => {
    haAdapterMock.getStates.mockResolvedValue([
      makeState("binary_sensor.motion", "off"),
    ]);
    haAdapterMock.isNotableState.mockReturnValue(false);

    const result = await syncHomeAssistantAlerts(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("skips already existing items", async () => {
    haAdapterMock.getStates.mockResolvedValue([makeState("binary_sensor.motion", "on")]);
    prismaMock.inboxItem.findFirst.mockResolvedValue({ id: "existing" });

    const result = await syncHomeAssistantAlerts(adapter);

    expect(result).toEqual({ synced: 0, skipped: 1, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("counts errors when create throws", async () => {
    haAdapterMock.getStates.mockResolvedValue([makeState("binary_sensor.motion", "on")]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockRejectedValue(new Error("DB error"));

    const result = await syncHomeAssistantAlerts(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 1 });
  });

  it("respects maxEntities option", async () => {
    const states = Array.from({ length: 10 }, (_, i) => makeState(`binary_sensor.sensor_${i}`, "on"));
    haAdapterMock.getStates.mockResolvedValue(states);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Alert" });

    const result = await syncHomeAssistantAlerts(adapter, { maxEntities: 3 });

    expect(result.synced).toBe(3);
    expect(prismaMock.inboxItem.create).toHaveBeenCalledTimes(3);
  });

  it("emits inbox.item.created and inbox.item.classified events", async () => {
    haAdapterMock.getStates.mockResolvedValue([makeState("binary_sensor.motion", "on")]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Alert: Motion" });

    await syncHomeAssistantAlerts(adapter);

    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.created", expect.objectContaining({ sourceType: "HOME_ASSISTANT" }));
    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.classified", expect.objectContaining({ classification: "ALERT" }));
  });

  it("formats entity title from entity_id", async () => {
    haAdapterMock.getStates.mockResolvedValue([makeState("binary_sensor.front_door_motion", "on")]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Alert: Front Door Motion" });

    await syncHomeAssistantAlerts(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.title).toBe("Alert: Front Door Motion");
  });
});
