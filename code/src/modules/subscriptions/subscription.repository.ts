import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { Subscription } from "@prisma/client";
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from "./subscription.types";

function buildUpdateData(input: UpdateSubscriptionInput): Record<string, unknown> {
  const fields: Array<[keyof UpdateSubscriptionInput, unknown]> = [
    ["name", input.name],
    ["provider", input.provider],
    ["amount", input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined],
    ["currency", input.currency],
    ["billingCycle", input.billingCycle],
    ["nextRenewalAt", input.nextRenewalAt],
    ["status", input.status],
    ["notes", input.notes],
    ["url", input.url],
    ["alertDaysBefore", input.alertDaysBefore],
  ];
  const result: Record<string, unknown> = {};
  for (const [key, value] of fields) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export class SubscriptionRepository {
  async findById(id: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({ where: { id } });
  }

  async list(): Promise<Subscription[]> {
    return prisma.subscription.findMany({ orderBy: { nextRenewalAt: "asc" } });
  }

  async findUpcoming(days: number): Promise<Subscription[]> {
    const future = new Date(Date.now() + days * 86400000);
    return prisma.subscription.findMany({
      where: { status: "ACTIVE" as never, nextRenewalAt: { lte: future } },
      orderBy: { nextRenewalAt: "asc" },
    });
  }

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    return prisma.subscription.create({
      data: {
        name: input.name,
        provider: input.provider,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency ?? "EUR",
        billingCycle: input.billingCycle as never,
        nextRenewalAt: input.nextRenewalAt,
        notes: input.notes,
        url: input.url,
        alertDaysBefore: input.alertDaysBefore ?? 7,
      },
    });
  }

async update(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    return prisma.subscription.update({ where: { id }, data: buildUpdateData(input) as never });
  }

  async delete(id: string): Promise<void> {
    await prisma.subscription.delete({ where: { id } });
  }
}
