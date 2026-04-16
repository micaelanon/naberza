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

export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const task = await service.cancelTask(id);
    return NextResponse.json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    console.error(`[Tasks API] POST /api/${id}/cancel:`, error);
    return NextResponse.json({ error: message }, { status });
  }
}
