import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    upsertFromPaperless: vi.fn(),
  },
}));

vi.mock("@/modules/documents/document.repository", () => ({
  DocumentRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/documents/document.service", () => ({
  DocumentService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as listGet } from "../route";
import { GET as detailGet } from "../[id]/route";
import { POST as syncPost } from "../sync/route";

function makeDocSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    title: "Test",
    documentType: "OTHER",
    correspondent: null,
    tags: [],
    externalUrl: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    title: "Test",
    externalId: "ext-1",
    sourceConnectionId: "conn-1",
    documentType: "OTHER",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("GET /documents/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listDocuments.mockResolvedValue({ items: [makeDocSummary()], total: 1 });
    const req = new NextRequest("http://localhost/documents/api");
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it("passes type filter", async () => {
    serviceMock.listDocuments.mockResolvedValue({ items: [], total: 0 });
    const req = new NextRequest("http://localhost/documents/api?type=INVOICE");
    await listGet(req);
    expect(serviceMock.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ type: "INVOICE" }),
    );
  });

  it("ignores unknown type filter", async () => {
    serviceMock.listDocuments.mockResolvedValue({ items: [], total: 0 });
    const req = new NextRequest("http://localhost/documents/api?type=BOGUS");
    await listGet(req);
    expect(serviceMock.listDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    );
  });

  it("returns 500 on service error", async () => {
    serviceMock.listDocuments.mockRejectedValue(new Error("DB down"));
    const req = new NextRequest("http://localhost/documents/api");
    const res = await listGet(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /documents/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with document", async () => {
    serviceMock.getDocument.mockResolvedValue(makeDocument());
    const res = await detailGet(new Request("http://localhost/documents/api/doc-1"), {
      params: Promise.resolve({ id: "doc-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("doc-1");
  });

  it("returns 404 when not found", async () => {
    serviceMock.getDocument.mockResolvedValue(null);
    const res = await detailGet(new Request("http://localhost/documents/api/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 on service error", async () => {
    serviceMock.getDocument.mockRejectedValue(new Error("DB down"));
    const res = await detailGet(new Request("http://localhost/documents/api/doc-1"), {
      params: Promise.resolve({ id: "doc-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /documents/api/sync", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 201 when document created", async () => {
    serviceMock.upsertFromPaperless.mockResolvedValue({ document: makeDocument(), created: true });
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ title: "Doc", externalId: "ext-1", sourceConnectionId: "conn-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.created).toBe(true);
  });

  it("returns 200 when document updated", async () => {
    serviceMock.upsertFromPaperless.mockResolvedValue({ document: makeDocument(), created: false });
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ title: "Doc", externalId: "ext-1", sourceConnectionId: "conn-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(false);
  });

  it("returns 400 when title missing", async () => {
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ externalId: "ext-1", sourceConnectionId: "conn-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when externalId missing", async () => {
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ title: "Doc", sourceConnectionId: "conn-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when sourceConnectionId missing", async () => {
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ title: "Doc", externalId: "ext-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    serviceMock.upsertFromPaperless.mockRejectedValue(new Error("DB down"));
    const req = new Request("http://localhost/documents/api/sync", {
      method: "POST",
      body: JSON.stringify({ title: "Doc", externalId: "ext-1", sourceConnectionId: "conn-1" }),
    });
    const res = await syncPost(req);
    expect(res.status).toBe(500);
  });
});
