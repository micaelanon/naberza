import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { ProjectRepository } from "@/modules/projects/project.repository";
import { ProjectService } from "@/modules/projects/project.service";

function parseDate(value: unknown): Date | undefined {
  return typeof value === "string" ? new Date(value) : undefined;
}

function parseDateOrNull(value: unknown): Date | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? new Date(value) : undefined;
}

function parseUpdateBody(body: Record<string, unknown>) {
  return {
    name: body.name as string | undefined,
    description: body.description as string | undefined,
    status: body.status as string | undefined,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
    startedAt: parseDate(body.startedAt),
    dueAt: parseDate(body.dueAt),
    completedAt: parseDateOrNull(body.completedAt),
  };
}

const repository = new ProjectRepository();
const service = new ProjectService(repository);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const project = await service.getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[Projects API] GET /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const project = await service.updateProject(id, parseUpdateBody(body));
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[Projects API] PATCH /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await service.deleteProject(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("[Projects API] DELETE /[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
