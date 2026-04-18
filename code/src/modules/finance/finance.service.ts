import { eventBus } from "@/lib/events";
import type { FinanceRepository } from "./finance.repository";
import type {
  FinancialEntry,
  FinanceEntrySummary,
  CreateFinanceEntryInput,
  UpdateFinanceEntryInput,
  ListFinanceEntriesOptions,
} from "./finance.types";

export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  async getEntry(id: string): Promise<FinancialEntry | null> {
    return this.repository.findById(id);
  }

  async listEntries(options: ListFinanceEntriesOptions = {}): Promise<{
    items: FinanceEntrySummary[];
    total: number;
  }> {
    const [entries, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count({
        type: options.type,
        isAnomaly: options.isAnomaly,
        search: options.search,
        from: options.from,
        to: options.to,
      }),
    ]);

    const items: FinanceEntrySummary[] = entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount.toString(),
      currency: e.currency,
      category: e.category,
      description: e.description,
      date: e.date,
      isAnomaly: e.isAnomaly,
      anomalyReason: e.anomalyReason,
    }));

    return { items, total };
  }

  async createEntry(input: CreateFinanceEntryInput): Promise<FinancialEntry> {
    const entry = await this.repository.create(input);

    await eventBus.emit("finance.entry.created", {
      entryId: entry.id,
      type: entry.type,
      amount: Number(entry.amount),
      currency: entry.currency,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return entry;
  }

  async updateEntry(id: string, input: UpdateFinanceEntryInput): Promise<FinancialEntry | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async flagAnomaly(id: string, reason: string): Promise<FinancialEntry | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    const entry = await this.repository.flagAnomaly(id, reason);

    await eventBus.emit("finance.anomaly.detected", {
      entryId: entry.id,
      type: entry.type,
      amount: Number(entry.amount),
      currency: entry.currency,
      anomalyReason: reason,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return entry;
  }

  async listAnomalies(): Promise<FinanceEntrySummary[]> {
    const entries = await this.repository.findAnomalies();
    return entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount.toString(),
      currency: e.currency,
      category: e.category,
      description: e.description,
      date: e.date,
      isAnomaly: e.isAnomaly,
      anomalyReason: e.anomalyReason,
    }));
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Finance entry not found: ${id}`);
    await this.repository.delete(id);
  }
}
