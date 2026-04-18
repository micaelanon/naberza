import { prisma } from "@/lib/db";
import type {
  FinancialEntry,
  CreateFinanceEntryInput,
  UpdateFinanceEntryInput,
  ListFinanceEntriesOptions,
} from "./finance.types";

export class FinanceRepository {
  async findById(id: string): Promise<FinancialEntry | null> {
    return prisma.financialEntry.findUnique({ where: { id } });
  }

  async list(options: ListFinanceEntriesOptions = {}): Promise<FinancialEntry[]> {
    const { type, isAnomaly, search, from, to, limit = 50, offset = 0 } = options;
    return prisma.financialEntry.findMany({
      where: {
        ...(type && { type }),
        ...(isAnomaly !== undefined && { isAnomaly }),
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
        ...(search && {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async count(options: Pick<ListFinanceEntriesOptions, "type" | "isAnomaly" | "search" | "from" | "to"> = {}): Promise<number> {
    const { type, isAnomaly, search, from, to } = options;
    return prisma.financialEntry.count({
      where: {
        ...(type && { type }),
        ...(isAnomaly !== undefined && { isAnomaly }),
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
        ...(search && {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
    });
  }

  async create(input: CreateFinanceEntryInput): Promise<FinancialEntry> {
    return prisma.financialEntry.create({
      data: {
        type: input.type,
        amount: input.amount,
        currency: input.currency ?? "EUR",
        category: input.category,
        description: input.description,
        date: input.date,
        invoiceId: input.invoiceId,
      },
    });
  }

  async update(id: string, input: UpdateFinanceEntryInput): Promise<FinancialEntry> {
    return prisma.financialEntry.update({ where: { id }, data: input });
  }

  async flagAnomaly(id: string, reason: string): Promise<FinancialEntry> {
    return prisma.financialEntry.update({
      where: { id },
      data: { isAnomaly: true, anomalyReason: reason },
    });
  }

  async findAnomalies(): Promise<FinancialEntry[]> {
    return prisma.financialEntry.findMany({
      where: { isAnomaly: true },
      orderBy: { date: "desc" },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.financialEntry.delete({ where: { id } });
  }
}
