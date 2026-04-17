import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { prismaMock, eventBusMock, paperlessAdapterMock } = vi.hoisted(() => ({
  prismaMock: {
    inboxItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  eventBusMock: {
    emit: vi.fn(),
  },
  paperlessAdapterMock: {
    connectionId: "conn-paperless-1",
    type: "paperless" as const,
    getDocuments: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { syncPaperlessDocuments } from "../paperless.sync";
import type { PaperlessAdapter } from "../paperless.adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeDoc(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Document ${id}`,
    original_file_name: `doc-${id}.pdf`,
    content: "Sample content",
    created: "2026-01-01",
    added: "2026-01-01",
    modified: "2026-01-01",
    tags: [],
    document_type: null,
    correspondent: null,
    ...overrides,
  };
}

function makePageResponse(docs: ReturnType<typeof makeDoc>[], hasNext = false) {
  // eslint-disable-next-line sonarjs/no-clear-text-protocols
  return { count: docs.length, next: hasNext ? "http://next" : null, previous: null, results: docs };
}

const adapter = paperlessAdapterMock as unknown as PaperlessAdapter;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("syncPaperlessDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
  paperlessAdapterMock.getDownloadUrl.mockReturnValue("http://paperless.local/download/1");
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Document 1" });
    eventBusMock.emit.mockResolvedValue(undefined);
  });

  it("returns zeroed result when no documents", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([]));

    const result = await syncPaperlessDocuments(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("creates inbox items for new documents", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1), makeDoc(2)]));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create
      .mockResolvedValueOnce({ id: "item-1", title: "Document 1" })
      .mockResolvedValueOnce({ id: "item-2", title: "Document 2" });

    const result = await syncPaperlessDocuments(adapter);

    expect(result).toEqual({ synced: 2, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).toHaveBeenCalledTimes(2);
  });

  it("skips already existing documents", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1)]));
    prismaMock.inboxItem.findFirst.mockResolvedValue({ id: "existing" });

    const result = await syncPaperlessDocuments(adapter);

    expect(result).toEqual({ synced: 0, skipped: 1, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("counts errors when create throws", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1)]));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockRejectedValue(new Error("DB error"));

    const result = await syncPaperlessDocuments(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 1 });
  });

  it("stops pagination when next is null", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1)], false));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Document 1" });

    await syncPaperlessDocuments(adapter);

    expect(paperlessAdapterMock.getDocuments).toHaveBeenCalledTimes(1);
  });

  it("continues to next page when next is set", async () => {
    paperlessAdapterMock.getDocuments
      .mockResolvedValueOnce(makePageResponse([makeDoc(1)], true))
      .mockResolvedValueOnce(makePageResponse([makeDoc(2)], false));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create
      .mockResolvedValueOnce({ id: "item-1", title: "Document 1" })
      .mockResolvedValueOnce({ id: "item-2", title: "Document 2" });

    const result = await syncPaperlessDocuments(adapter);

    expect(result).toEqual({ synced: 2, skipped: 0, errors: 0 });
    expect(paperlessAdapterMock.getDocuments).toHaveBeenCalledTimes(2);
  });

  it("emits inbox.item.created and inbox.item.classified events", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1)]));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Document 1" });

    await syncPaperlessDocuments(adapter);

    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.created", expect.objectContaining({ itemId: "item-1" }));
    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.classified", expect.objectContaining({ classification: "DOCUMENT" }));
  });

  it("uses document title when available", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1, { title: "My Invoice" })]));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "My Invoice" });

    await syncPaperlessDocuments(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.title).toBe("My Invoice");
  });

  it("falls back to filename when title is empty", async () => {
    paperlessAdapterMock.getDocuments.mockResolvedValue(makePageResponse([makeDoc(1, { title: "" })]));
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "doc-1.pdf" });

    await syncPaperlessDocuments(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.title).toBe("doc-1.pdf");
  });
});
