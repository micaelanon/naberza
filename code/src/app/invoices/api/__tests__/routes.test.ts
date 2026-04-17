import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listInvoices: vi.fn(),
    createInvoice: vi.fn(),
    getInvoice: vi.fn(),
    markPaid: vi.fn(),
  },
}));

vi.mock("@/modules/invoices/invoice.repository", () => ({
  InvoiceRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@/modules/invoices/invoice.service", () => ({
  InvoiceService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as listGet, POST as createPost } from "../route";
import { GET as detailGet } from "../[id]/route";
import { POST as payPost } from "../[id]/pay/route";

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    issuer: "Acme",
    amount: new Prisma.Decimal("100"),
    currency: "EUR",
    issueDate: new Date("2026-01-01"),
    dueDate: null,
    status: "PENDING",
    isRecurring: false,
    category: null,
    ...overrides,
  };
}

describe("GET /invoices/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listInvoices.mockResolvedValue({ items: [makeInvoice()], total: 1 });
    const res = await listGet(new NextRequest("http://localhost/invoices/api"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it("passes status filter", async () => {
    serviceMock.listInvoices.mockResolvedValue({ items: [], total: 0 });
    await listGet(new NextRequest("http://localhost/invoices/api?status=PAID"));
    expect(serviceMock.listInvoices).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID" }));
  });

  it("ignores unknown status filter", async () => {
    serviceMock.listInvoices.mockResolvedValue({ items: [], total: 0 });
    await listGet(new NextRequest("http://localhost/invoices/api?status=BOGUS"));
    expect(serviceMock.listInvoices).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));
  });

  it("returns 500 on error", async () => {
    serviceMock.listInvoices.mockRejectedValue(new Error("DB down"));
    const res = await listGet(new NextRequest("http://localhost/invoices/api"));
    expect(res.status).toBe(500);
  });
});

describe("POST /invoices/api", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 201 on success", async () => {
    serviceMock.createInvoice.mockResolvedValue(makeInvoice());
    const req = new NextRequest("http://localhost/invoices/api", {
      method: "POST",
      body: JSON.stringify({ issuer: "Acme", amount: 100, issueDate: "2026-01-01" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(201);
  });

  it("returns 400 when issuer missing", async () => {
    const req = new NextRequest("http://localhost/invoices/api", {
      method: "POST",
      body: JSON.stringify({ amount: 100, issueDate: "2026-01-01" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is zero", async () => {
    const req = new NextRequest("http://localhost/invoices/api", {
      method: "POST",
      body: JSON.stringify({ issuer: "Acme", amount: 0, issueDate: "2026-01-01" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when issueDate missing", async () => {
    const req = new NextRequest("http://localhost/invoices/api", {
      method: "POST",
      body: JSON.stringify({ issuer: "Acme", amount: 100 }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    serviceMock.createInvoice.mockRejectedValue(new Error("DB down"));
    const req = new NextRequest("http://localhost/invoices/api", {
      method: "POST",
      body: JSON.stringify({ issuer: "Acme", amount: 100, issueDate: "2026-01-01" }),
    });
    const res = await createPost(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /invoices/api/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with invoice", async () => {
    serviceMock.getInvoice.mockResolvedValue(makeInvoice());
    const res = await detailGet(new Request("http://localhost/invoices/api/inv-1"), {
      params: Promise.resolve({ id: "inv-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.getInvoice.mockResolvedValue(null);
    const res = await detailGet(new Request("http://localhost/invoices/api/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 on error", async () => {
    serviceMock.getInvoice.mockRejectedValue(new Error("DB down"));
    const res = await detailGet(new Request("http://localhost/invoices/api/inv-1"), {
      params: Promise.resolve({ id: "inv-1" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /invoices/api/[id]/pay", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 when marked paid", async () => {
    serviceMock.markPaid.mockResolvedValue(makeInvoice({ status: "PAID" }));
    const res = await payPost(new Request("http://localhost/invoices/api/inv-1/pay"), {
      params: Promise.resolve({ id: "inv-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("PAID");
  });

  it("returns 404 when not found", async () => {
    serviceMock.markPaid.mockResolvedValue(null);
    const res = await payPost(new Request("http://localhost/invoices/api/missing/pay"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 on error", async () => {
    serviceMock.markPaid.mockRejectedValue(new Error("DB down"));
    const res = await payPost(new Request("http://localhost/invoices/api/inv-1/pay"), {
      params: Promise.resolve({ id: "inv-1" }),
    });
    expect(res.status).toBe(500);
  });
});
