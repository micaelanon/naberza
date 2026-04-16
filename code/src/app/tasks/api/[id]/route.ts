import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { TaskRepository } from "@/modules/tasks/task.repository";
import { TaskService } from "@/modules/tasks/task.service";

const repository = new TaskRepository();
const service = new TaskService(repository);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const task = await service.getTask(id);
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error(`[Tasks API] GET /api/${id}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const body = await request.json() as Parameters<typeof service.updateTask>[1];
    const task = await service.updateTask(id, body);
    return NextResponse.json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    console.error(`[Tasks API] PATCH /api/${id}:`, error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    await service.deleteTask(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    console.error(`[Tasks API] DELETE /api/${id}:`, error);
    return NextResponse.json({ error: message }, { status });
  }
}
