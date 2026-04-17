import type { FinancialEntry, FinancialEntryType } from "@prisma/client";

export type { FinancialEntryType };
export type { FinancialEntry };

// ─── Input types ────────────────────────────────────────────────

export interface CreateFinanceEntryInput {
  type: FinancialEntryType;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
  date: Date;
  invoiceId?: string;
}

export interface UpdateFinanceEntryInput {
  type?: FinancialEntryType;
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  date?: Date;
  isAnomaly?: boolean;
  anomalyReason?: string;
}

export interface ListFinanceEntriesOptions {
  type?: FinancialEntryType;
  isAnomaly?: boolean;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// ─── View types ─────────────────────────────────────────────────

export interface FinanceEntrySummary {
  id: string;
  type: FinancialEntryType;
  amount: string; // formatted decimal
  currency: string;
  category: string | null;
  description: string | null;
  date: Date;
  isAnomaly: boolean;
  anomalyReason: string | null;
}
