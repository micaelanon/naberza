import { describe, it, expect, vi, beforeEach } from "vitest";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    promote: vi.fn(),
    archive: vi.fn(),
    findByTag: vi.fn(),
    getTags: vi.fn(),
  },
  eventBusMock: {
    emit: vi.fn(),
  },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { IdeasService } from "../ideas.service";
import type { IdeasRepository } from "../ideas.repository";

const service = new IdeasService(repositoryMock as unknown as IdeasRepository);

function makeIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "API optimization",
    body: "Cache responses at CDN level",
    tags: ["performance", "backend"],
    status: "CAPTURED" as const,
    promotedToModule: null,
    promotedToEntityId: null,
    inboxItemId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("IdeasService.getIdea", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns idea when found", async () => {
    repositoryMock.findById.mockResolvedValue(makeIdea());
    const result = await service.getIdea("idea-1");
    expect(result?.id).toBe("idea-1");
  });

  it("returns null when not found", async () => {
    repositoryMock.findById.mockResolvedValue(null);
    const result = await service.getIdea("missing");
    expect(result).toBeNull();
  });
});

describe("IdeasService.listIdeas", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns items and total", async () => {
    repositoryMock.list.mockResolvedValue([makeIdea()]);
    repositoryMock.count.mockResolvedValue(1);
    const result = await service.listIdeas();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("maps to summary shape", async () => {
    repositoryMock.list.mockResolvedValue([makeIdea()]);
    repositoryMock.count.mockResolvedValue(1);
    const result = await service.listIdeas();
    expect(result.items[0]).toMatchObject({
      id: "idea-1",
      title: "API optimization",
      tags: ["performance", "backend"],
      status: "CAPTURED",
    });
  });
});

describe("IdeasService.createIdea", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("creates and emits idea.created", async () => {
    repositoryMock.create.mockResolvedValue(makeIdea());
    await service.createIdea({ title: "Test" });
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "idea.created",
      expect.objectContaining({ ideaId: "idea-1", title: "API optimization" }),
    );
  });
});

describe("IdeasService.promoteIdea", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("promotes and emits idea.promoted", async () => {
    repositoryMock.findById.mockResolvedValue(makeIdea());
    repositoryMock.promote.mockResolvedValue(makeIdea({ status: "PROMOTED" }));
    await service.promoteIdea("idea-1", "tasks", "task-x");
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "idea.promoted",
      expect.objectContaining({ ideaId: "idea-1", targetModule: "tasks" }),
    );
  });

  it("returns null when not found", async () => {
    repositoryMock.findById.mockResolvedValue(null);
    const result = await service.promoteIdea("missing", "tasks", "task-x");
    expect(result).toBeNull();
  });
});

describe("IdeasService.archiveIdea", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("archives idea", async () => {
    repositoryMock.findById.mockResolvedValue(makeIdea());
    repositoryMock.archive.mockResolvedValue(makeIdea({ status: "ARCHIVED" }));
    const result = await service.archiveIdea("idea-1");
    expect(result?.status).toBe("ARCHIVED");
  });
});

describe("IdeasService.findByTag", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns ideas with tag", async () => {
    repositoryMock.findByTag.mockResolvedValue([makeIdea()]);
    const result = await service.findByTag("performance");
    expect(result).toHaveLength(1);
  });
});

describe("IdeasService.getAllTags", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns all tags sorted", async () => {
    repositoryMock.getTags.mockResolvedValue(["backend", "performance", "ux"]);
    const result = await service.getAllTags();
    expect(result).toEqual(["backend", "performance", "ux"]);
  });
});
