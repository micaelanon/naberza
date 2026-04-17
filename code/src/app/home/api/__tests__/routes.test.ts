import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listEvents: vi.fn(),
    getEvent: vi.fn(),
    acknowledgeEvent: vi.fn(),
  },
}));

vi.mock("@/modules/home/home.repository", () => ({
  HomeRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@/modules/home/home.service", () => ({
  HomeService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as listGet } from "../events/route";
import { GET as detailGet } from "../events/[id]/route";
import { POST as acknowledgePost } from "../events/[id]/acknowledge/route";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    eventType: "state_changed",
    entityId: "binary_sensor.motion",
    state: "on",
    severity: "WARNING",
    acknowledgedAt: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("GET /home/api/events", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listEvents.mockResolvedValue({ items: [makeEvent()], total: 1 });
    const res = await listGet(new NextRequest("http://localhost/home/api/events"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it("passes severity filter", async () => {
    serviceMock.listEvents.mockResolvedValue({ items: [], total: 0 });
    await listGet(new NextRequest("http://localhost/home/api/events?severity=CRITICAL"));
    expect(serviceMock.listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "CRITICAL" }),
    );
  });

  it("ignores unknown severity", async () => {
    serviceMock.listEvents.mockResolvedValue({ items: [], total: 0 });
    await listGet(new NextRequest("http://localhost/home/api/events?severity=BOGUS"));
    expect(serviceMock.listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ severity: undefined }),
    );
  });

  it("passes acknowledged=false filter", async () => {
    serviceMock.listEvents.mockResolvedValue({ items: [], total: 0 });
    await listGet(new NextRequest("http://localhost/home/api/events?acknowledged=false"));
    expect(serviceMock.listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ acknowledged: false }),
    );
  });

  it("returns 500 on error", async () => {
    serviceMock.listEvents.mockRejectedValue(new Error("DB down"));
    const res = await listGet(new NextRequest("http://localhost/home/api/events"));
    expect(res.status).toBe(500);
  });
});

describe("GET /home/api/events/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with event", async () => {
    serviceMock.getEvent.mockResolvedValue(makeEvent());
    const res = await detailGet(new Request("http://localhost/home/api/events/evt-1"), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("evt-1");
  });

  it("returns 404 when not found", async () => {
    serviceMock.getEvent.mockResolvedValue(null);
    const res = await detailGet(new Request("http://localhost/home/api/events/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 on error", async () => {
    serviceMock.getEvent.mockRejectedValue(new Error("DB down"));
    const res = await detailGet(new Request("http://localhost/home/api/events/evt-1"), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /home/api/events/[id]/acknowledge", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 when acknowledged", async () => {
    serviceMock.acknowledgeEvent.mockResolvedValue(makeEvent({ acknowledgedAt: new Date() }));
    const res = await acknowledgePost(
      new Request("http://localhost/home/api/events/evt-1/acknowledge"),
      { params: Promise.resolve({ id: "evt-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.acknowledgeEvent.mockResolvedValue(null);
    const res = await acknowledgePost(
      new Request("http://localhost/home/api/events/missing/acknowledge"),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 on error", async () => {
    serviceMock.acknowledgeEvent.mockRejectedValue(new Error("DB down"));
    const res = await acknowledgePost(
      new Request("http://localhost/home/api/events/evt-1/acknowledge"),
      { params: Promise.resolve({ id: "evt-1" }) },
    );
    expect(res.status).toBe(500);
  });
});
