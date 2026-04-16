import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { InboxService } from "@/modules/inbox/inbox.service";

const repository = new InboxRepository();
const service = new InboxService(repository);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const item = await service.dismissItem(id);
    return NextResponse.json({ data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    console.error(`[Inbox API] POST /api/${id}/dismiss:`, error);
    return NextResponse.json({ error: message }, { status });
  }
}
