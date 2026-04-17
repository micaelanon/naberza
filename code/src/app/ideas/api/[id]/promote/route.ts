import { NextResponse } from "next/server";
import { IdeasRepository } from "@/modules/ideas/ideas.repository";
import { IdeasService } from "@/modules/ideas/ideas.service";

const repository = new IdeasRepository();
const service = new IdeasService(repository);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.moduleId !== "string" || !body.moduleId.trim()) {
    return NextResponse.json({ error: "moduleId is required" }, { status: 400 });
  }
  if (typeof body.entityId !== "string" || !body.entityId.trim()) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  try {
    const idea = await service.promoteIdea(id, body.moduleId, body.entityId);
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    return NextResponse.json({ data: idea });
  } catch (error) {
    console.error("[Ideas API] POST /ideas/api/[id]/promote:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
