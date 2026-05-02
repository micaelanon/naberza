import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { SubscriptionRepository } from "@/modules/subscriptions/subscription.repository";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";

const repository = new SubscriptionRepository();
const service = new SubscriptionService(repository);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const sub = await service.updateItem(id, {
      name: body.name as string | undefined,
      provider: body.provider as string | undefined,
      amount: body.amount ? Number(body.amount) : undefined,
      currency: body.currency as string | undefined,
      billingCycle: body.billingCycle as string | undefined,
      nextRenewalAt: body.nextRenewalAt ? new Date(body.nextRenewalAt as string) : undefined,
      status: body.status as string | undefined,
      notes: body.notes as string | undefined,
      url: body.url as string | undefined,
      alertDaysBefore: body.alertDaysBefore ? Number(body.alertDaysBefore) : undefined,
    });
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json({ data: sub });
  } catch (error) {
    console.error("[Subscriptions API] PATCH /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await service.deleteItem(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    console.error("[Subscriptions API] DELETE /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
