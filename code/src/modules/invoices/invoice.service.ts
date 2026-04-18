import { eventBus } from "@/lib/events";
import type { InvoiceRepository } from "./invoice.repository";
import type {
  Invoice,
  InvoiceSummary,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesOptions,
} from "./invoice.types";

export class InvoiceService {
  constructor(private readonly repository: InvoiceRepository) {}

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.repository.findById(id);
  }

  async listInvoices(options: ListInvoicesOptions = {}): Promise<{
    items: InvoiceSummary[];
    total: number;
  }> {
    const [invoices, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count({ status: options.status, isRecurring: options.isRecurring, search: options.search }),
    ]);

    const items: InvoiceSummary[] = invoices.map((inv) => ({
      id: inv.id,
      issuer: inv.issuer,
      amount: inv.amount.toString(),
      currency: inv.currency,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      isRecurring: inv.isRecurring,
      category: inv.category,
    }));

    return { items, total };
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const invoice = await this.repository.create(input);

    await eventBus.emit("invoice.created", {
      invoiceId: invoice.id,
      issuer: invoice.issuer,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return invoice;
  }

  async updateInvoice(id: string, input: UpdateInvoiceInput): Promise<Invoice | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async markPaid(id: string): Promise<Invoice | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    const invoice = await this.repository.markPaid(id);

    await eventBus.emit("invoice.paid", {
      invoiceId: invoice.id,
      issuer: invoice.issuer,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return invoice;
  }

  async detectOverdue(): Promise<number> {
    const overdue = await this.repository.findOverdue();
    await Promise.all(
      overdue.map(async (inv) => {
        await this.repository.markOverdue(inv.id);
        await eventBus.emit("invoice.overdue", {
          invoiceId: inv.id,
          issuer: inv.issuer,
          amount: Number(inv.amount),
          currency: inv.currency,
          timestamp: new Date(),
          actor: { type: "system" },
        });
      }),
    );
    return overdue.length;
  }

  async deleteInvoice(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Invoice not found: ${id}`);
    await this.repository.delete(id);
  }
}
