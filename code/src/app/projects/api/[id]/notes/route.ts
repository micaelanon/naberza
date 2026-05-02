import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { ProjectRepository } from "@/modules/projects/project.repository";
import { ProjectService } from "@/modules/projects/project.service";

const repository = new ProjectRepository();
const service = new ProjectService(repository);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }
    await service.addNote(id, body.body);
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  } catch (error) {
    console.error("[Projects API] POST /[id]/notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
