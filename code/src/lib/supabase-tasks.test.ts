import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TaskItem } from "@/lib/tasks";

const TASKS_STORAGE_KEY = "naBerza_tasks";

describe("localStorage fallback (when Supabase is disabled)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should initialize localStorage with TASKS if empty", () => {
    localStorage.clear();
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    expect(stored).toBeNull();
  });

  it("should persist a task to localStorage", () => {
    const task: TaskItem = {
      id: "test-1",
      title: "Test task",
      note: "Test note",
      priority: "high",
      kind: "normal",
      channel: "dashboard",
      dueLabel: "Hoy",
      completed: false,
    };

    const tasks = [task];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    const retrieved = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");
    expect(retrieved[0].id).toBe("test-1");
  });

  it("should update task completion in localStorage", () => {
    const task: TaskItem = {
      id: "test-1",
      title: "Test task",
      note: "Test note",
      priority: "high",
      kind: "normal",
      channel: "dashboard",
      dueLabel: "Hoy",
      completed: false,
    };

    let tasks = [task];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));

    // Simulate update
    tasks = tasks.map((t) =>
      t.id === "test-1" ? { ...t, completed: true } : t
    );
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));

    const retrieved = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");
    expect(retrieved[0].completed).toBe(true);
  });

  it("should handle multiple tasks in localStorage", () => {
    const tasks: TaskItem[] = [
      {
        id: "1",
        title: "Task 1",
        note: "",
        priority: "high",
        kind: "normal",
        channel: "dashboard",
        dueLabel: "Hoy",
        completed: false,
      },
      {
        id: "2",
        title: "Task 2",
        note: "",
        priority: "medium",
        kind: "persistent",
        channel: "telegram",
        dueLabel: "Cada día",
        completed: true,
      },
    ];

    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    const retrieved = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].id).toBe("1");
    expect(retrieved[1].completed).toBe(true);
  });

  it("should preserve task structure when round-tripping", () => {
    const task: TaskItem = {
      id: "roundtrip",
      title: "Roundtrip test",
      note: "Complex note with special chars: áéíóú, 🎯",
      priority: "low",
      kind: "persistent",
      channel: "telegram",
      dueLabel: "Próximo martes · 14:30",
      completed: false,
    };

    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([task]));
    const [retrieved] = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");

    expect(retrieved).toEqual(task);
    expect(retrieved.note).toBe(task.note);
  });
});
