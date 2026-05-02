import type { SubscriptionRepository } from "./subscription.repository";
import type { Subscription } from "@prisma/client";
import type { CreateSubscriptionInput, UpdateSubscriptionInput, SubscriptionSummary } from "./subscription.types";

function monthlyEquivalent(amount: string, cycle: string): number {
  const a = Number(amount);
  switch (cycle) {
    case "MONTHLY": return a;
    case "QUARTERLY": return a / 3;
    case "ANNUAL": return a / 12;
    default: return 0;
  }
}

export class SubscriptionService {
  constructor(private readonly repository: SubscriptionRepository) {}

  async getItem(id: string): Promise<Subscription | null> {
    return this.repository.findById(id);
  }

  async listItems(): Promise<{ items: SubscriptionSummary[]; monthly: number; annual: number }> {
    const subs = await this.repository.list();
    const items = subs.map((s) => ({
      id: s.id, name: s.name, provider: s.provider,
      amount: s.amount.toString(), currency: s.currency,
      billingCycle: s.billingCycle, nextRenewalAt: s.nextRenewalAt,
      status: s.status, notes: s.notes, url: s.url,
      alertDaysBefore: s.alertDaysBefore, createdAt: s.createdAt,
    }));
    const monthly = items.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle), 0);
    const annual = monthly * 12;
    return { items, monthly, annual };
  }

  async createItem(input: CreateSubscriptionInput): Promise<Subscription> {
    return this.repository.create(input);
  }

  async updateItem(id: string, input: UpdateSubscriptionInput): Promise<Subscription | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Subscription not found: ${id}`);
    await this.repository.delete(id);
  }
}
