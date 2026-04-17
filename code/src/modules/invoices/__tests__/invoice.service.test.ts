import { describe, it, expect, vi, beforeEach } from "vitest";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    markPaid: vi.fn(),
    markOverdue: vi.fn(),
    findOverdue: vi.fn(),
  },
  eventBusMock: { emit: vi.fn() },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { InvoiceService } from "../invoice.service";
import type { InvoiceRepository } from "../invoice.repository";
import { Prisma } from "@prisma/client";

const service = new InvoiceService(repositoryMock as unknown as InvoiceRepository);

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    issuer: "Acme Corp",
    amount: new Prisma.Decimal("120.00"),
    currency: "EUR",
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-02-01"),
    status: "PENDING" as const,
    category: null,
    isRecurring: false,
    documentId: null,
    inboxItemId: null,
    paidAt: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("InvoiceService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("getInvoice", () => {
    it("returns invoice when found", async () => {
      repositoryMock.findById.mockResolvedValue(makeInvoice());
      const result = await service.getInvoice("inv-1");
      expect(result?.id).toBe("inv-1");
    });

    it("returns null when not found", async () => {
      repositoryMock.findById.mockResolvedValue(null);
      const result = await service.getInvoice("missing");
      expect(result).toBeNull();
    });
  });

  describe("listInvoices", () => {
    it("returns items and total", async () => {
      repositoryMock.list.mockResolvedValue([makeInvoice()]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listInvoices();

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it("maps amount to string", async () => {
      repositoryMock.list.mockResolvedValue([makeInvoice()]);
      repositoryMock.count.mockResolvedValue(1);

      const result = await service.listInvoices();

      expect(typeof result.items[0].amount).toBe("string");
      expect(result.items[0].amount).toBe("120");
    });

    it("returns empty list when no invoices", async () => {
      repositoryMock.list.mockResolvedValue([]);
      repositoryMock.count.mockResolvedValue(0);

      const result = await service.listInvoices();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("createInvoice", () => {
    it("creates invoice and emits invoice.created", async () => {
      repositoryMock.create.mockResolvedValue(makeInvoice());

      const invoice = await service.createInvoice({
        issuer: "Acme Corp",
        amount: 120,
        issueDate: new Date("2026-01-01"),
      });

      expect(invoice.id).toBe("inv-1");
      expect(eventBusMock.emit).toHaveBeenCalledWith(
        "invoice.created",
        expect.objectContaining({ invoiceId: "inv-1", issuer: "Acme Corp" }),
      );
    });
  });

  describe("markPaid", () => {
    it("returns null when invoice not found", async () => {
      repositoryMock.findById.mockResolvedValue(null);
      const result = await service.markPaid("missing");
      expect(result).toBeNull();
      expect(repositoryMock.markPaid).not.toHaveBeenCalled();
    });

    it("marks invoice as paid and emits invoice.paid", async () => {
      repositoryMock.findById.mockResolvedValue(makeInvoice());
      repositoryMock.markPaid.mockResolvedValue(makeInvoice({ status: "PAID", paidAt: new Date() }));

      const result = await service.markPaid("inv-1");

      expect(result?.status).toBe("PAID");
      expect(eventBusMock.emit).toHaveBeenCalledWith(
        "invoice.paid",
        expect.objectContaining({ invoiceId: "inv-1" }),
      );
    });
  });

  describe("detectOverdue", () => {
    it("returns 0 when nothing overdue", async () => {
      repositoryMock.findOverdue.mockResolvedValue([]);
      const count = await service.detectOverdue();
      expect(count).toBe(0);
      expect(repositoryMock.markOverdue).not.toHaveBeenCalled();
    });

    it("marks each overdue invoice and emits events", async () => {
      const overdueInvoices = [makeInvoice({ id: "inv-a" }), makeInvoice({ id: "inv-b" })];
      repositoryMock.findOverdue.mockResolvedValue(overdueInvoices);
      repositoryMock.markOverdue.mockResolvedValue(makeInvoice({ status: "OVERDUE" }));

      const count = await service.detectOverdue();

      expect(count).toBe(2);
      expect(repositoryMock.markOverdue).toHaveBeenCalledTimes(2);
      expect(eventBusMock.emit).toHaveBeenCalledTimes(2);
      expect(eventBusMock.emit).toHaveBeenCalledWith("invoice.overdue", expect.any(Object));
    });
  });
});
