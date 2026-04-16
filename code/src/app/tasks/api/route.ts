import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { TaskRepository } from "@/modules/tasks/task.repository";
import { TaskService } from "@/modules/tasks/task.service";
import type { TaskFilters, TaskStatus, TaskKind, Priority } from "@/modules/tasks/task.types";

const repository = new TaskRepository();
const service = new TaskService(repository);

function parseFilters(searchParams: URLSearchParams): TaskFilters {
  const tags = searchParams.getAll("tags");
  return {
    status: (searchParams.get("status") as TaskStatus) ?? undefined,
    kind: (searchParams.get("kind") as TaskKind) ?? undefined,
    priority: (searchParams.get("priority") as Priority) ?? undefined,
    search: searchParams.get("search") ?? undefined,
    dueBefore: searchParams.get("dueBefore") ? new Date(searchParams.get("dueBefore")!) : undefined,
    dueAfter: searchParams.get("dueAfter") ? new Date(searchParams.get("dueAfter")!) : undefined,
    tags: tags.length ? tags : undefined,
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
    const result = await service.getTasks(parseFilters(request.nextUrl.searchParams));
    return NextResponse.json({
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    });
  } catch (error) {
    console.error("[Tasks API] GET /api:", error);
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
    const task = await service.createTask({
      title: body.title as string,
      description: body.description as string | undefined,
      priority: body.priority as Priority | undefined,
      kind: body.kind as TaskKind | undefined,
      dueAt: body.dueAt ? new Date(body.dueAt as string) : undefined,
      recurrenceRule: body.recurrenceRule as string | undefined,
      tags: body.tags as string[] | undefined,
      inboxItemId: body.inboxItemId as string | undefined,
    });
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("required") ? 400 : 500;
    console.error("[Tasks API] POST /api:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
