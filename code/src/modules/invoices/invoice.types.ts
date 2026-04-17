import type { Invoice, InvoiceStatus } from "@prisma/client";

export type { InvoiceStatus };
export type { Invoice };

// ─── Input types ────────────────────────────────────────────────

export interface CreateInvoiceInput {
  issuer: string;
  amount: number;
  currency?: string;
  issueDate: Date;
  dueDate?: Date;
  status?: InvoiceStatus;
  category?: string;
  isRecurring?: boolean;
  documentId?: string;
  inboxItemId?: string;
  notes?: string;
}

export interface UpdateInvoiceInput {
  issuer?: string;
  amount?: number;
  currency?: string;
  issueDate?: Date;
  dueDate?: Date;
  status?: InvoiceStatus;
  category?: string;
  isRecurring?: boolean;
  notes?: string;
  paidAt?: Date | null;
}

export interface ListInvoicesOptions {
  status?: InvoiceStatus;
  isRecurring?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── View types ─────────────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  issuer: string;
  amount: string; // formatted decimal
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  status: InvoiceStatus;
  isRecurring: boolean;
  category: string | null;
}
