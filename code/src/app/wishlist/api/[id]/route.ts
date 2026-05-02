import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { WishlistRepository } from "@/modules/wishlist/wishlist.repository";
import { WishlistService } from "@/modules/wishlist/wishlist.service";

const repository = new WishlistRepository();
const service = new WishlistService(repository);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const item = await service.getItem(id);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[Wishlist API] GET /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function parsePurchasedAt(value: unknown): Date | null | undefined {
  if (typeof value === "string") return new Date(value);
  if (value === null) return null;
  return undefined;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await service.updateItem(id, {
      title: body.title as string | undefined,
      url: body.url as string | undefined,
      notes: body.notes as string | undefined,
      priceEst: body.priceEst ? Number(body.priceEst) : undefined,
      currency: body.currency as string | undefined,
      priority: body.priority as string | undefined,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      status: body.status as string | undefined,
      purchasedAt: parsePurchasedAt(body.purchasedAt),
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[Wishlist API] PATCH /[id]:", error);
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
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    console.error("[Wishlist API] DELETE /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
