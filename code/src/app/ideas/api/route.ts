import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { IdeasRepository } from "@/modules/ideas/ideas.repository";
import { IdeasService } from "@/modules/ideas/ideas.service";

const repository = new IdeasRepository();
const service = new IdeasService(repository);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const tags = searchParams.getAll("tags");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listIdeas({
      status: (status as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      search,
      tags: tags.length > 0 ? tags : undefined,
      limit,
      offset,
    });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Ideas API] GET /ideas/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validateCreateBody(body: Record<string, unknown>): string | null {
  if (typeof body.title !== "string" || !body.title.trim()) return "title is required";
  return null;
}

function buildCreateInput(body: Record<string, unknown>) {
  return {
    title: (body.title as string).trim(),
    body: typeof body.body === "string" ? body.body : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string") : undefined,
    inboxItemId: typeof body.inboxItemId === "string" ? body.inboxItemId : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateCreateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const idea = await service.createIdea(buildCreateInput(body));
    return NextResponse.json({ data: idea }, { status: 201 });
  } catch (error) {
    console.error("[Ideas API] POST /ideas/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET_TAGS() {
  try {
    const tags = await service.getAllTags();
    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("[Ideas API] GET /ideas/api/tags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
