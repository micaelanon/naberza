import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listIdeas: vi.fn(),
    getIdea: vi.fn(),
    createIdea: vi.fn(),
    updateIdea: vi.fn(),
    archiveIdea: vi.fn(),
    promoteIdea: vi.fn(),
  },
}));

vi.mock("@/modules/ideas/ideas.repository", () => ({
  IdeasRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/ideas/ideas.service", () => ({
  IdeasService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as listGet, POST as createPost } from "../route";
import { GET as detailGet, PATCH as updatePatch, DELETE as deleteCall } from "../[id]/route";
import { POST as promotePost } from "../[id]/promote/route";

function makeIdeaSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "API optimization",
    body: "Cache at CDN",
    tags: ["performance"],
    status: "CAPTURED",
    promotedToModule: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "API optimization",
    body: "Cache at CDN",
    tags: ["performance"],
    status: "CAPTURED",
    promotedToModule: null,
    promotedToEntityId: null,
    inboxItemId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("GET /ideas/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listIdeas.mockResolvedValue({ items: [makeIdeaSummary()], total: 1 });
    const req = new NextRequest("http://localhost/ideas/api");
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it("returns 500 on service error", async () => {
    serviceMock.listIdeas.mockRejectedValue(new Error("DB down"));
    const req = new NextRequest("http://localhost/ideas/api");
    const res = await listGet(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /ideas/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 201 with created idea", async () => {
    serviceMock.createIdea.mockResolvedValue(makeIdea());
    const req = new NextRequest("http://localhost/ideas/api", {
      method: "POST",
      body: JSON.stringify({ title: "Test idea" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(201);
  });

  it("returns 400 when title missing", async () => {
    const req = new NextRequest("http://localhost/ideas/api", {
      method: "POST",
      body: JSON.stringify({ body: "No title" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /ideas/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with idea", async () => {
    serviceMock.getIdea.mockResolvedValue(makeIdea());
    const res = await detailGet(new Request("http://localhost/ideas/api/idea-1"), {
      params: Promise.resolve({ id: "idea-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.getIdea.mockResolvedValue(null);
    const res = await detailGet(new Request("http://localhost/ideas/api/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /ideas/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with updated idea", async () => {
    serviceMock.updateIdea.mockResolvedValue(makeIdea({ tags: ["new"] }));
    const res = await updatePatch(
      new Request("http://localhost/ideas/api/idea-1", {
        method: "PATCH",
        body: JSON.stringify({ tags: ["new"] }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) },
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /ideas/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with archived idea", async () => {
    serviceMock.archiveIdea.mockResolvedValue(makeIdea({ status: "ARCHIVED" }));
    const res = await deleteCall(new Request("http://localhost/ideas/api/idea-1"), {
      params: Promise.resolve({ id: "idea-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.archiveIdea.mockResolvedValue(null);
    const res = await deleteCall(new Request("http://localhost/ideas/api/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /ideas/api/[id]/promote", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with promoted idea", async () => {
    serviceMock.promoteIdea.mockResolvedValue(makeIdea({ status: "PROMOTED" }));
    const res = await promotePost(
      new Request("http://localhost/ideas/api/idea-1/promote", {
        method: "POST",
        body: JSON.stringify({ moduleId: "tasks", entityId: "task-1" }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when moduleId missing", async () => {
    const res = await promotePost(
      new Request("http://localhost/ideas/api/idea-1/promote", {
        method: "POST",
        body: JSON.stringify({ entityId: "task-1" }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) },
    );
    expect(res.status).toBe(400);
  });
});
