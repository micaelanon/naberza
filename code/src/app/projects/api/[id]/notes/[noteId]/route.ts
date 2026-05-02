import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { ProjectRepository } from "@/modules/projects/project.repository";
import { ProjectService } from "@/modules/projects/project.service";

const repository = new ProjectRepository();
const service = new ProjectService(repository);

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await service.deleteNote((await params).noteId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Projects API] DELETE /[id]/notes/[noteId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
