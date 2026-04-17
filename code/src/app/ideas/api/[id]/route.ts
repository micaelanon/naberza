import { NextResponse } from "next/server";
import { IdeasRepository } from "@/modules/ideas/ideas.repository";
import { IdeasService } from "@/modules/ideas/ideas.service";

const repository = new IdeasRepository();
const service = new IdeasService(repository);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const idea = await service.getIdea(id);
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    return NextResponse.json({ data: idea });
  } catch (error) {
    console.error("[Ideas API] GET /ideas/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

  try {
    const idea = await service.updateIdea(id, body);
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    return NextResponse.json({ data: idea });
  } catch (error) {
    console.error("[Ideas API] PATCH /ideas/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const idea = await service.archiveIdea(id);
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    return NextResponse.json({ data: idea });
  } catch (error) {
    console.error("[Ideas API] DELETE /ideas/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
