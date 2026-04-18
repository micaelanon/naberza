import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesOptions,
  Invoice,
} from "./invoice.types";

export class InvoiceRepository {
  async findById(id: string): Promise<Invoice | null> {
    return prisma.invoice.findUnique({ where: { id } });
  }

  async list(options: ListInvoicesOptions = {}): Promise<Invoice[]> {
    return prisma.invoice.findMany({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.isRecurring !== undefined ? { isRecurring: options.isRecurring } : {}),
        ...(options.search
          ? {
              OR: [
                { issuer: { contains: options.search, mode: "insensitive" } },
                { category: { contains: options.search, mode: "insensitive" } },
                { notes: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { issueDate: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  async count(options: Pick<ListInvoicesOptions, "status" | "isRecurring" | "search"> = {}): Promise<number> {
    return prisma.invoice.count({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.isRecurring !== undefined ? { isRecurring: options.isRecurring } : {}),
        ...(options.search
          ? {
              OR: [
                { issuer: { contains: options.search, mode: "insensitive" } },
                { category: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    return prisma.invoice.create({
      data: {
        issuer: input.issuer,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency ?? "EUR",
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        status: input.status ?? "PENDING",
        category: input.category,
        isRecurring: input.isRecurring ?? false,
        documentId: input.documentId,
        inboxItemId: input.inboxItemId,
        notes: input.notes,
      },
    });
  }

  private buildUpdateData(input: UpdateInvoiceInput): Record<string, unknown> {
    return { ...this.buildScalarPatch(input), ...this.buildDatesPatch(input) };
  }

  private buildScalarPatch(input: UpdateInvoiceInput): Record<string, unknown> {
    return {
      ...(input.issuer !== undefined ? { issuer: input.issuer } : {}),
      ...(input.amount !== undefined ? { amount: new Prisma.Decimal(input.amount) } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };
  }

  private buildDatesPatch(input: UpdateInvoiceInput): Record<string, unknown> {
    return {
      ...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
    };
  }

  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id },
      data: this.buildUpdateData(input),
    });
  }

  async markPaid(id: string): Promise<Invoice> {
    return this.update(id, { status: "PAID", paidAt: new Date() });
  }

  async markOverdue(id: string): Promise<Invoice> {
    return this.update(id, { status: "OVERDUE" });
  }

  async delete(id: string): Promise<void> {
    await prisma.invoice.delete({ where: { id } });
  }

  async findOverdue(): Promise<Invoice[]> {
    return prisma.invoice.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
    });
  }
}
