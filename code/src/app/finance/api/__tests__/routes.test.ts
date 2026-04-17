import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listEntries: vi.fn(),
    getEntry: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    flagAnomaly: vi.fn(),
  },
}));

vi.mock("@/modules/finance/finance.repository", () => ({
  FinanceRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/finance/finance.service", () => ({
  FinanceService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as listGet, POST as createPost } from "../route";
import { GET as detailGet, PATCH as updatePatch } from "../[id]/route";
import { POST as flagPost } from "../[id]/flag/route";

function makeEntrySummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    type: "EXPENSE",
    amount: "49.99",
    currency: "EUR",
    category: "utilities",
    description: "Electric bill",
    date: new Date("2026-01-15"),
    isAnomaly: false,
    anomalyReason: null,
    ...overrides,
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    type: "EXPENSE",
    amount: 49.99,
    currency: "EUR",
    category: "utilities",
    description: "Electric bill",
    date: new Date("2026-01-15"),
    invoiceId: null,
    isAnomaly: false,
    anomalyReason: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

describe("GET /finance/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listEntries.mockResolvedValue({ items: [makeEntrySummary()], total: 1 });
    const req = new NextRequest("http://localhost/finance/api");
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it("passes type filter", async () => {
    serviceMock.listEntries.mockResolvedValue({ items: [], total: 0 });
    const req = new NextRequest("http://localhost/finance/api?type=INCOME");
    await listGet(req);
    expect(serviceMock.listEntries).toHaveBeenCalledWith(
      expect.objectContaining({ type: "INCOME" }),
    );
  });

  it("ignores unknown type filter", async () => {
    serviceMock.listEntries.mockResolvedValue({ items: [], total: 0 });
    const req = new NextRequest("http://localhost/finance/api?type=BOGUS");
    await listGet(req);
    expect(serviceMock.listEntries).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    );
  });

  it("passes anomaly filter", async () => {
    serviceMock.listEntries.mockResolvedValue({ items: [], total: 0 });
    const req = new NextRequest("http://localhost/finance/api?anomaly=true");
    await listGet(req);
    expect(serviceMock.listEntries).toHaveBeenCalledWith(
      expect.objectContaining({ isAnomaly: true }),
    );
  });

  it("returns 500 on service error", async () => {
    serviceMock.listEntries.mockRejectedValue(new Error("DB down"));
    const req = new NextRequest("http://localhost/finance/api");
    const res = await listGet(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /finance/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 201 with created entry", async () => {
    serviceMock.createEntry.mockResolvedValue(makeEntry());
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: JSON.stringify({ type: "EXPENSE", amount: 49.99, date: "2026-01-15" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("entry-1");
  });

  it("returns 400 when type missing", async () => {
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: JSON.stringify({ amount: 49.99, date: "2026-01-15" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount missing", async () => {
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: JSON.stringify({ type: "EXPENSE", date: "2026-01-15" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when date missing", async () => {
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: JSON.stringify({ type: "EXPENSE", amount: 49.99 }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: "not json",
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    serviceMock.createEntry.mockRejectedValue(new Error("DB down"));
    const req = new NextRequest("http://localhost/finance/api", {
      method: "POST",
      body: JSON.stringify({ type: "EXPENSE", amount: 49.99, date: "2026-01-15" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /finance/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with entry", async () => {
    serviceMock.getEntry.mockResolvedValue(makeEntry());
    const res = await detailGet(new Request("http://localhost/finance/api/entry-1"), {
      params: Promise.resolve({ id: "entry-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("entry-1");
  });

  it("returns 404 when not found", async () => {
    serviceMock.getEntry.mockResolvedValue(null);
    const res = await detailGet(new Request("http://localhost/finance/api/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 on service error", async () => {
    serviceMock.getEntry.mockRejectedValue(new Error("DB down"));
    const res = await detailGet(new Request("http://localhost/finance/api/entry-1"), {
      params: Promise.resolve({ id: "entry-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("PATCH /finance/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with updated entry", async () => {
    serviceMock.updateEntry.mockResolvedValue(makeEntry({ category: "rent" }));
    const res = await updatePatch(
      new Request("http://localhost/finance/api/entry-1", {
        method: "PATCH",
        body: JSON.stringify({ category: "rent" }),
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.category).toBe("rent");
  });

  it("returns 404 when not found", async () => {
    serviceMock.updateEntry.mockResolvedValue(null);
    const res = await updatePatch(
      new Request("http://localhost/finance/api/missing", {
        method: "PATCH",
        body: JSON.stringify({ category: "rent" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await updatePatch(
      new Request("http://localhost/finance/api/entry-1", {
        method: "PATCH",
        body: "not json",
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /finance/api/[id]/flag", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with flagged entry", async () => {
    serviceMock.flagAnomaly.mockResolvedValue(makeEntry({ isAnomaly: true, anomalyReason: "Dup" }));
    const res = await flagPost(
      new Request("http://localhost/finance/api/entry-1/flag", {
        method: "POST",
        body: JSON.stringify({ reason: "Dup" }),
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isAnomaly).toBe(true);
  });

  it("returns 404 when not found", async () => {
    serviceMock.flagAnomaly.mockResolvedValue(null);
    const res = await flagPost(
      new Request("http://localhost/finance/api/missing/flag", {
        method: "POST",
        body: JSON.stringify({ reason: "Dup" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when reason missing", async () => {
    const res = await flagPost(
      new Request("http://localhost/finance/api/entry-1/flag", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await flagPost(
      new Request("http://localhost/finance/api/entry-1/flag", {
        method: "POST",
        body: "not json",
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    serviceMock.flagAnomaly.mockRejectedValue(new Error("DB down"));
    const res = await flagPost(
      new Request("http://localhost/finance/api/entry-1/flag", {
        method: "POST",
        body: JSON.stringify({ reason: "Dup" }),
      }),
      { params: Promise.resolve({ id: "entry-1" }) },
    );
    expect(res.status).toBe(500);
  });
});
