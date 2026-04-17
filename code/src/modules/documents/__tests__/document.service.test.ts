import { describe, it, expect, vi, beforeEach } from "vitest";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  },
  eventBusMock: {
    emit: vi.fn(),
  },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { DocumentService } from "../document.service";
import type { DocumentRepository } from "../document.repository";

const service = new DocumentService(repositoryMock as unknown as DocumentRepository);

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    title: "Test Document",
    externalId: "ext-1",
    externalUrl: null,
    sourceConnectionId: "conn-1",
    documentType: "OTHER" as const,
    correspondent: null,
    tags: [],
    contentPreview: null,
    archivedAt: null,
    inboxItemId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("DocumentService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("getDocument", () => {
    it("returns document when found", async () => {
      repositoryMock.findById.mockResolvedValue(makeDocument());
      const result = await service.getDocument("doc-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("doc-1");
    });

    it("returns null when not found", async () => {
      repositoryMock.findById.mockResolvedValue(null);
      const result = await service.getDocument("missing");
      expect(result).toBeNull();
    });
  });

  describe("listDocuments", () => {
    it("returns items and total", async () => {
      repositoryMock.list.mockResolvedValue([makeDocument()]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listDocuments();

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("doc-1");
    });

    it("maps documents to summary shape", async () => {
      repositoryMock.list.mockResolvedValue([makeDocument({ correspondent: "Acme" })]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listDocuments();
      const item = result.items[0];

      expect(item).toMatchObject({
        id: "doc-1",
        title: "Test Document",
        documentType: "OTHER",
        correspondent: "Acme",
        tags: [],
      });
    });

    it("returns empty list when no documents", async () => {
      repositoryMock.list.mockResolvedValue([]);
      repositoryMock.count.mockResolvedValue(0);

      const result = await service.listDocuments();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("upsertFromPaperless", () => {
    const input = {
      title: "Invoice Jan",
      externalId: "ext-42",
      sourceConnectionId: "conn-paperless",
    };

    it("emits document.created when new", async () => {
      repositoryMock.upsert.mockResolvedValue({ document: makeDocument(), created: true });

      await service.upsertFromPaperless(input);

      expect(eventBusMock.emit).toHaveBeenCalledWith(
        "document.created",
        expect.objectContaining({ documentId: "doc-1" }),
      );
    });

    it("emits document.updated when existing", async () => {
      repositoryMock.upsert.mockResolvedValue({ document: makeDocument(), created: false });

      await service.upsertFromPaperless(input);

      expect(eventBusMock.emit).toHaveBeenCalledWith(
        "document.updated",
        expect.objectContaining({ documentId: "doc-1" }),
      );
    });

    it("returns created flag correctly", async () => {
      repositoryMock.upsert.mockResolvedValue({ document: makeDocument(), created: true });

      const result = await service.upsertFromPaperless(input);

      expect(result.created).toBe(true);
      expect(result.document.id).toBe("doc-1");
    });
  });
});
