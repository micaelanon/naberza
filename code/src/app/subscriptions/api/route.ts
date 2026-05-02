import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { SubscriptionRepository } from "@/modules/subscriptions/subscription.repository";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";

const repository = new SubscriptionRepository();
const service = new SubscriptionService(repository);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await service.listItems();
    return NextResponse.json({ data: result.items, meta: { monthly: result.monthly, annual: result.annual } });
  } catch (error) {
    console.error("[Subscriptions API] GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validateSubBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) return "Name is required";
  if (!body.amount || typeof body.amount !== "number") return "Amount is required";
  if (!body.billingCycle || typeof body.billingCycle !== "string") return "Billing cycle is required";
  if (!body.nextRenewalAt) return "Next renewal date is required";
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validationError = validateSubBody(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const sub = await service.createItem({
      name: body.name as string,
      provider: body.provider as string | undefined,
      amount: Number(body.amount),
      currency: body.currency as string | undefined,
      billingCycle: body.billingCycle as string,
      nextRenewalAt: new Date(body.nextRenewalAt as string),
      notes: body.notes as string | undefined,
      url: body.url as string | undefined,
      alertDaysBefore: body.alertDaysBefore ? Number(body.alertDaysBefore) : undefined,
    });
    return NextResponse.json({ data: sub }, { status: 201 });
  } catch (error) {
    console.error("[Subscriptions API] POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
