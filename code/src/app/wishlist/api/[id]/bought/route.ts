import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { WishlistRepository } from "@/modules/wishlist/wishlist.repository";
import { WishlistService } from "@/modules/wishlist/wishlist.service";

const repository = new WishlistRepository();
const service = new WishlistService(repository);

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const item = await service.markBought(id);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[Wishlist API] POST /[id]/bought:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
