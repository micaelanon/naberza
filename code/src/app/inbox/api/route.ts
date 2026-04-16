import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { InboxService } from "@/modules/inbox/inbox.service";
import type {
  InboxFilters,
  InboxStatus,
  InboxSourceType,
  InboxClassification,
  Priority,
} from "@/modules/inbox/inbox.types";

const repository = new InboxRepository();
const service = new InboxService(repository);

function parseFilters(searchParams: URLSearchParams): InboxFilters {
  return {
    status: (searchParams.get("status") as InboxStatus) ?? undefined,
    sourceType: (searchParams.get("sourceType") as InboxSourceType) ?? undefined,
    classification: (searchParams.get("classification") as InboxClassification) ?? undefined,
    priority: (searchParams.get("priority") as Priority) ?? undefined,
    search: searchParams.get("search") ?? undefined,
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await service.getItems(parseFilters(request.nextUrl.searchParams));
    return NextResponse.json({
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    });
  } catch (error) {
    console.error("[Inbox API] GET /api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const item = await service.createItem({
      title: body.title as string,
      body: body.body as string | undefined,
      sourceType: ((body.sourceType as string) ?? "MANUAL") as InboxSourceType,
      sourceConnectionId: body.sourceConnectionId as string | undefined,
      sourceExternalId: body.sourceExternalId as string | undefined,
      sourceRawPayload: body.sourceRawPayload as Record<string, unknown> | undefined,
      priority: body.priority as Priority | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("required") ? 400 : 500;
    console.error("[Inbox API] POST /api:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
