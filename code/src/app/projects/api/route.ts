import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { ProjectRepository } from "@/modules/projects/project.repository";
import { ProjectService } from "@/modules/projects/project.service";

const repository = new ProjectRepository();
const service = new ProjectService(repository);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const projects = await service.listProjects();
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("[Projects API] GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const project = await service.createProject({
      name: body.name as string,
      description: body.description as string | undefined,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      startedAt: body.startedAt ? new Date(body.startedAt as string) : undefined,
      dueAt: body.dueAt ? new Date(body.dueAt as string) : undefined,
    });
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[Projects API] POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
