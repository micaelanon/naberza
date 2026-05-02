import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { WishlistRepository } from "@/modules/wishlist/wishlist.repository";
import { WishlistService } from "@/modules/wishlist/wishlist.service";

const repository = new WishlistRepository();
const service = new WishlistService(repository);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await service.listItems({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      priority: request.nextUrl.searchParams.get("priority") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ? Number(request.nextUrl.searchParams.get("page")) : undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ? Number(request.nextUrl.searchParams.get("pageSize")) : undefined,
    });
    return NextResponse.json({ data: result.items, meta: { total: result.total } });
  } catch (error) {
    console.error("[Wishlist API] GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const item = await service.createItem({
      title: body.title as string,
      url: body.url as string | undefined,
      notes: body.notes as string | undefined,
      priceEst: body.priceEst ? Number(body.priceEst) : undefined,
      currency: body.currency as string | undefined,
      priority: body.priority as string | undefined,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[Wishlist API] POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
