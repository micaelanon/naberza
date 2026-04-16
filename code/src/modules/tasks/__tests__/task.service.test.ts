import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskService } from "../task.service";
import type { TaskRepository } from "../task.repository";
import type { Task } from "../task.types";

const mockTask: Task = {
  id: "task-1",
  title: "Test task",
  description: "Test description",
  priority: "NONE",
  kind: "NORMAL",
  status: "PENDING",
  dueAt: null,
  recurrenceRule: null,
  tags: [],
  inboxItemId: null,
  completedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const makeRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
  findAll: vi.fn().mockResolvedValue({ items: [mockTask], total: 1, page: 1, pageSize: 20 }),
  findById: vi.fn().mockResolvedValue(mockTask),
  create: vi.fn().mockResolvedValue(mockTask),
  update: vi.fn().mockResolvedValue(mockTask),
  complete: vi.fn().mockResolvedValue({ ...mockTask, status: "COMPLETED", completedAt: new Date() }),
  cancel: vi.fn().mockResolvedValue({ ...mockTask, status: "CANCELLED" }),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
} as unknown as TaskRepository);

const makeEventBus = () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
});

describe("TaskService", () => {
  let repository: ReturnType<typeof makeRepository>;
  let events: ReturnType<typeof makeEventBus>;
  let service: TaskService;

  beforeEach(() => {
    repository = makeRepository();
    events = makeEventBus();
    service = new TaskService(repository, events as never);
  });

  describe("getTasks", () => {
    it("returns list from repository", async () => {
      const result = await service.getTasks();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });

    it("passes filters to repository", async () => {
      await service.getTasks({ status: "PENDING", priority: "HIGH" });
      expect(repository.findAll).toHaveBeenCalledWith({ status: "PENDING", priority: "HIGH" });
    });
  });

  describe("getTask", () => {
    it("returns task by id", async () => {
      const task = await service.getTask("task-1");
      expect(task?.id).toBe("task-1");
    });

    it("returns null when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new TaskService(repository, events as never);
      expect(await service.getTask("missing")).toBeNull();
    });
  });

  describe("createTask", () => {
    it("creates task and emits event", async () => {
      const task = await service.createTask({ title: "New task", sourceType: "MANUAL" } as never);
      expect(task.id).toBe("task-1");
      expect(events.emit).toHaveBeenCalledWith("task.created", expect.objectContaining({
        taskId: "task-1",
      }));
    });

    it("throws when title is empty", async () => {
      await expect(service.createTask({ title: "" } as never)).rejects.toThrow("required");
    });

    it("throws when title is whitespace", async () => {
      await expect(service.createTask({ title: "  " } as never)).rejects.toThrow("required");
    });
  });

  describe("updateTask", () => {
    it("updates task", async () => {
      await service.updateTask("task-1", { title: "Updated" });
      expect(repository.update).toHaveBeenCalledWith("task-1", { title: "Updated" });
    });

    it("throws when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new TaskService(repository, events as never);
      await expect(service.updateTask("missing", {})).rejects.toThrow("not found");
    });
  });

  describe("completeTask", () => {
    it("completes task and emits event", async () => {
      const task = await service.completeTask("task-1");
      expect(task.status).toBe("COMPLETED");
      expect(events.emit).toHaveBeenCalledWith("task.completed", expect.objectContaining({
        taskId: "task-1",
      }));
    });

    it("throws when already completed", async () => {
      repository = makeRepository({
        findById: vi.fn().mockResolvedValue({ ...mockTask, status: "COMPLETED" }),
      });
      service = new TaskService(repository, events as never);
      await expect(service.completeTask("task-1")).rejects.toThrow("already completed");
    });

    it("throws when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new TaskService(repository, events as never);
      await expect(service.completeTask("missing")).rejects.toThrow("not found");
    });
  });

  describe("cancelTask", () => {
    it("cancels task", async () => {
      const task = await service.cancelTask("task-1");
      expect(task.status).toBe("CANCELLED");
    });

    it("throws when already cancelled", async () => {
      repository = makeRepository({
        findById: vi.fn().mockResolvedValue({ ...mockTask, status: "CANCELLED" }),
      });
      service = new TaskService(repository, events as never);
      await expect(service.cancelTask("task-1")).rejects.toThrow("already cancelled");
    });

    it("throws when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new TaskService(repository, events as never);
      await expect(service.cancelTask("missing")).rejects.toThrow("not found");
    });
  });

  describe("deleteTask", () => {
    it("deletes task", async () => {
      await service.deleteTask("task-1");
      expect(repository.delete).toHaveBeenCalledWith("task-1");
    });

    it("throws when not found", async () => {
      repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
      service = new TaskService(repository, events as never);
      await expect(service.deleteTask("missing")).rejects.toThrow("not found");
    });
  });
});
