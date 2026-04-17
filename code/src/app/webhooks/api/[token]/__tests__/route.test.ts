import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { inboxServiceMock, isValidWebhookTokenMock } = vi.hoisted(() => ({
  inboxServiceMock: {
    createItem: vi.fn(),
  },
  isValidWebhookTokenMock: vi.fn(),
}));

vi.mock("@/lib/webhooks", () => ({
  isValidWebhookToken: isValidWebhookTokenMock,
}));

vi.mock("@/modules/inbox/inbox.repository", () => ({
  InboxRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/inbox/inbox.service", () => ({
  InboxService: vi.fn().mockImplementation(() => inboxServiceMock),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(token: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/webhooks/api/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /webhooks/api/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is invalid", async () => {
    isValidWebhookTokenMock.mockReturnValue(false);

    const res = await POST(makeRequest("bad-token", { title: "Test" }), makeParams("bad-token"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(inboxServiceMock.createItem).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);

    const req = new NextRequest("http://localhost/webhooks/api/valid-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const res = await POST(req, makeParams("valid-token"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when title is missing", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);

    const res = await POST(makeRequest("valid-token", { body: "No title here" }), makeParams("valid-token"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "title is required" });
    expect(inboxServiceMock.createItem).not.toHaveBeenCalled();
  });

  it("returns 400 when title is empty string", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);

    const res = await POST(makeRequest("valid-token", { title: "   " }), makeParams("valid-token"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "title is required" });
  });

  it("returns 201 and item data on success", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-abc", title: "Alert from webhook" });

    const res = await POST(
      makeRequest("valid-token", { title: "Alert from webhook" }),
      makeParams("valid-token"),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ data: { id: "item-abc", title: "Alert from webhook" } });
  });

  it("calls createItem with sourceType API", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(makeRequest("valid-token", { title: "Test" }), makeParams("valid-token"));

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: "API" }),
    );
  });

  it("forwards body text when present", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", body: "Some details" }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Some details" }),
    );
  });

  it("sanitizes valid priority value", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", priority: "HIGH" }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "HIGH" }),
    );
  });

  it("strips invalid priority value", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", priority: "URGENT" }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ priority: undefined }),
    );
  });

  it("uses payload.id as externalId when present", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", id: "ext-123" }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ sourceExternalId: "ext-123" }),
    );
  });

  it("uses payload.event_id as externalId when id is missing", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", event_id: "evt-456" }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ sourceExternalId: "evt-456" }),
    );
  });

  it("falls back to generated externalId when no id fields", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(makeRequest("valid-token", { title: "Test" }), makeParams("valid-token"));

    const call = inboxServiceMock.createItem.mock.calls[0][0];
    expect(call.sourceExternalId).toMatch(/^wh-/);
  });

  it("forwards metadata when present", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1", title: "Test" });

    await POST(
      makeRequest("valid-token", { title: "Test", metadata: { source: "ha", entity: "binary_sensor.motion" } }),
      makeParams("valid-token"),
    );

    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { source: "ha", entity: "binary_sensor.motion" } }),
    );
  });

  it("returns 500 when createItem throws", async () => {
    isValidWebhookTokenMock.mockReturnValue(true);
    inboxServiceMock.createItem.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(makeRequest("valid-token", { title: "Test" }), makeParams("valid-token"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });
});
