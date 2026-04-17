import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isValidWebhookToken } from "@/lib/webhooks";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { InboxService } from "@/modules/inbox/inbox.service";
import type { Priority } from "@/modules/inbox/inbox.types";

const repository = new InboxRepository();
const service = new InboxService(repository);

const VALID_PRIORITIES = new Set<Priority>(["LOW", "MEDIUM", "HIGH", "NONE"]);

function sanitizePriority(raw: unknown): Priority | undefined {
  if (typeof raw === "string" && VALID_PRIORITIES.has(raw as Priority)) {
    return raw as Priority;
  }
  return undefined;
}

function buildExternalId(token: string, payload: Record<string, unknown>): string {
  if (typeof payload.id === "string") return payload.id;
  if (typeof payload.event_id === "string") return payload.event_id;
  return `wh-${token.slice(0, 8)}-${Date.now()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isValidWebhookToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const item = await service.createItem({
      title,
      body: typeof body.body === "string" ? body.body : undefined,
      sourceType: "API",
      sourceConnectionId: `webhook:${token.slice(0, 8)}`,
      sourceExternalId: buildExternalId(token, body),
      sourceRawPayload: body,
      priority: sanitizePriority(body.priority),
      metadata:
        typeof body.metadata === "object" && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });

    return NextResponse.json({ data: { id: item.id, title: item.title } }, { status: 201 });
  } catch (error) {
    console.error("[Webhooks API] POST /webhooks/api/[token]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
