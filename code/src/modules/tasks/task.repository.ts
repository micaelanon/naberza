import { prisma } from "@/lib/db";
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  TaskListResult,
  UpdateTaskDto,
} from "./task.types";

const DEFAULT_PAGE_SIZE = 20;

function buildDueRange(dueBefore?: Date, dueAfter?: Date) {
  if (!dueBefore && !dueAfter) return {};
  return { dueAt: { ...(dueAfter && { gte: dueAfter }), ...(dueBefore && { lte: dueBefore }) } };
}

function buildTaskWhere(filters: TaskFilters) {
  const { status, kind, priority, search, dueBefore, dueAfter, tags } = filters;

  const searchClause = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return {
    ...(status && { status }),
    ...(kind && { kind }),
    ...(priority && { priority }),
    ...searchClause,
    ...buildDueRange(dueBefore, dueAfter),
    ...(tags?.length && { tags: { hasSome: tags } }),
  };
}

function buildUpdateData(dto: UpdateTaskDto) {
  const fields = {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.description !== undefined && { description: dto.description }),
    ...(dto.priority !== undefined && { priority: dto.priority }),
    ...(dto.kind !== undefined && { kind: dto.kind }),
    ...(dto.status !== undefined && { status: dto.status }),
  };

  const scheduling = {
    ...(dto.dueAt !== undefined && { dueAt: dto.dueAt }),
    ...(dto.recurrenceRule !== undefined && { recurrenceRule: dto.recurrenceRule }),
    ...(dto.tags !== undefined && { tags: dto.tags }),
  };

  return { ...fields, ...scheduling };
}

export class TaskRepository {
  async findAll(filters: TaskFilters = {}): Promise<TaskListResult> {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;
    const where = buildTaskWhere(filters);

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return { items: items as Task[], total, page, pageSize };
  }

  async findById(id: string): Promise<Task | null> {
    const item = await prisma.task.findUnique({ where: { id } });
    return item as Task | null;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const item = await prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? "NONE",
        kind: dto.kind ?? "NORMAL",
        dueAt: dto.dueAt,
        recurrenceRule: dto.recurrenceRule,
        tags: dto.tags ?? [],
        inboxItemId: dto.inboxItemId,
      },
    });
    return item as Task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const item = await prisma.task.update({
      where: { id },
      data: buildUpdateData(dto),
    });
    return item as Task;
  }

  async complete(id: string): Promise<Task> {
    const item = await prisma.task.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return item as Task;
  }

  async cancel(id: string): Promise<Task> {
    const item = await prisma.task.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return item as Task;
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  }
}
