import { describe, it, expect, beforeEach } from "vitest";
import { TASKS, type TaskItem } from "@/lib/tasks";

describe("TASKS data structure", () => {
  it("should have at least 3 demo tasks", () => {
    expect(TASKS.length).toBeGreaterThanOrEqual(3);
  });

  it("should have valid task structure", () => {
    TASKS.forEach((task) => {
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("priority");
      expect(task).toHaveProperty("kind");
      expect(task).toHaveProperty("channel");
      expect(task).toHaveProperty("completed");
    });
  });

  it("should have tasks with valid priority values", () => {
    TASKS.forEach((task) => {
      expect(["high", "medium", "low"]).toContain(task.priority);
    });
  });

  it("should have tasks with valid kind values", () => {
    TASKS.forEach((task) => {
      expect(["persistent", "normal"]).toContain(task.kind);
    });
  });

  it("should have tasks with valid channel values", () => {
    TASKS.forEach((task) => {
      expect(["dashboard", "telegram"]).toContain(task.channel);
    });
  });

  it("should have at least one persistent task", () => {
    const persistent = TASKS.filter((t) => t.kind === "persistent");
    expect(persistent.length).toBeGreaterThan(0);
  });

  it("should have at least one normal task", () => {
    const normal = TASKS.filter((t) => t.kind === "normal");
    expect(normal.length).toBeGreaterThan(0);
  });
});

describe("TaskItem type", () => {
  let sampleTask: TaskItem;

  beforeEach(() => {
    sampleTask = {
      id: "test-1",
      title: "Test task",
      note: "This is a test note",
      priority: "high",
      kind: "normal",
      channel: "dashboard",
      dueLabel: "Mañana · 09:00",
      completed: false,
    };
  });

  it("should create a valid task item", () => {
    expect(sampleTask.id).toBe("test-1");
    expect(sampleTask.title).toBe("Test task");
    expect(sampleTask.completed).toBe(false);
  });

  it("should toggle completion status", () => {
    const updated = { ...sampleTask, completed: !sampleTask.completed };
    expect(updated.completed).toBe(true);
    expect(sampleTask.completed).toBe(false); // Original unchanged
  });

  it("should handle all priority levels", () => {
    const priorities: TaskItem["priority"][] = ["high", "medium", "low"];
    priorities.forEach((priority) => {
      const task = { ...sampleTask, priority };
      expect(task.priority).toBe(priority);
    });
  });

  it("should handle all kinds", () => {
    const kinds: TaskItem["kind"][] = ["persistent", "normal"];
    kinds.forEach((kind) => {
      const task = { ...sampleTask, kind };
      expect(task.kind).toBe(kind);
    });
  });

  it("should handle all channels", () => {
    const channels: TaskItem["channel"][] = ["dashboard", "telegram"];
    channels.forEach((channel) => {
      const task = { ...sampleTask, channel };
      expect(task.channel).toBe(channel);
    });
  });
});
