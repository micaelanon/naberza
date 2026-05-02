import type { Subscription, BillingCycle, SubscriptionStatus } from "@prisma/client";
export type { Subscription, BillingCycle, SubscriptionStatus };

export interface CreateSubscriptionInput {
  name: string;
  provider?: string;
  amount: number;
  currency?: string;
  billingCycle: string;
  nextRenewalAt: Date;
  notes?: string;
  url?: string;
  alertDaysBefore?: number;
}

export interface UpdateSubscriptionInput {
  name?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  billingCycle?: string;
  nextRenewalAt?: Date;
  status?: string;
  notes?: string;
  url?: string;
  alertDaysBefore?: number;
}

export interface SubscriptionSummary {
  id: string;
  name: string;
  provider: string | null;
  amount: string;
  currency: string;
  billingCycle: string;
  nextRenewalAt: Date;
  status: string;
  notes: string | null;
  url: string | null;
  alertDaysBefore: number;
  createdAt: Date;
}
