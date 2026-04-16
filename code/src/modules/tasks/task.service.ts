import { eventBus } from "@/lib/events";
import type { EventBus, EventActor } from "@/lib/events";
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  TaskListResult,
  UpdateTaskDto,
} from "./task.types";
import type { TaskRepository } from "./task.repository";

const SYSTEM_ACTOR: EventActor = { type: "system" };

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly events: EventBus = eventBus
  ) {}

  async getTasks(filters: TaskFilters = {}): Promise<TaskListResult> {
    return this.repository.findAll(filters);
  }

  async getTask(id: string): Promise<Task | null> {
    return this.repository.findById(id);
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    if (!dto.title?.trim()) {
      throw new Error("Task title is required");
    }

    const task = await this.repository.create(dto);

    await this.events.emit("task.created", {
      timestamp: new Date(),
      actor: SYSTEM_ACTOR,
      taskId: task.id,
      title: task.title,
    });

    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    return this.repository.update(id, dto);
  }

  async completeTask(id: string): Promise<Task> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    if (existing.status === "COMPLETED") {
      throw new Error("Task is already completed");
    }

    const task = await this.repository.complete(id);

    await this.events.emit("task.completed", {
      timestamp: new Date(),
      actor: SYSTEM_ACTOR,
      taskId: task.id,
      title: task.title,
    });

    return task;
  }

  async cancelTask(id: string): Promise<Task> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    if (existing.status === "CANCELLED") {
      throw new Error("Task is already cancelled");
    }

    return this.repository.cancel(id);
  }

  async deleteTask(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    await this.repository.delete(id);
  }
}
