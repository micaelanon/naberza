import { describe, it, expect } from "vitest";

import type { TaskItem } from "@/lib/tasks";
import { formatTodayLabel, getActiveTasks, getTaskCollections, isFormDirty, isUpcomingTask, INITIAL_FORM } from "../utils/helpers";

const makeTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: "t1",
  title: "Test",
  note: "",
  priority: "medium",
  kind: "normal",
  channel: "dashboard",
  dueLabel: "Hoy",
  completed: false,
  ...overrides,
});

describe("isUpcomingTask", () => {
  it("returns false for completed tasks", () => {
    expect(isUpcomingTask(makeTask({ completed: true, dueLabel: "Mañana" }))).toBe(false);
  });

  it("returns false for tasks with no fixed date", () => {
    expect(isUpcomingTask(makeTask({ dueLabel: "Sin fecha fija" }))).toBe(false);
  });

  it("returns false for daily persistent tasks", () => {
    expect(isUpcomingTask(makeTask({ dueLabel: "Cada día · 09:00" }))).toBe(false);
  });

  it("returns true for pending tasks with a specific due label", () => {
    expect(isUpcomingTask(makeTask({ dueLabel: "Próximo martes" }))).toBe(true);
  });
});

describe("getTaskCollections", () => {
  const tasks: TaskItem[] = [
    makeTask({ id: "1", kind: "persistent", completed: false, dueLabel: "Cada día · 09:00" }),
    makeTask({ id: "2", kind: "normal", completed: false, dueLabel: "Sin fecha fija" }),
    makeTask({ id: "3", kind: "normal", completed: true, dueLabel: "Sin fecha fija" }),
    makeTask({ id: "4", kind: "normal", completed: false, dueLabel: "Próximo lunes" }),
  ];

  it("splits pending and completed correctly", () => {
    const c = getTaskCollections(tasks);
    expect(c.pending).toHaveLength(3);
    expect(c.completed).toHaveLength(1);
  });

  it("splits persistent and normal correctly", () => {
    const c = getTaskCollections(tasks);
    expect(c.persistent).toHaveLength(1);
    expect(c.normal).toHaveLength(2);
  });

  it("identifies upcoming tasks", () => {
    const c = getTaskCollections(tasks);
    expect(c.upcoming).toHaveLength(1);
    expect(c.upcoming[0].id).toBe("4");
  });
});

describe("getActiveTasks", () => {
  const collections = {
    pending: [makeTask({ id: "p" })],
    persistent: [makeTask({ id: "per", kind: "persistent" })],
    normal: [makeTask({ id: "n" })],
    completed: [makeTask({ id: "c", completed: true })],
    upcoming: [makeTask({ id: "u", dueLabel: "Mañana" })],
  };

  it("returns pending for today view", () => {
    expect(getActiveTasks("today", collections)).toEqual(collections.pending);
  });

  it("returns upcoming for upcoming view", () => {
    expect(getActiveTasks("upcoming", collections)).toEqual(collections.upcoming);
  });

  it("returns persistent for persistent view", () => {
    expect(getActiveTasks("persistent", collections)).toEqual(collections.persistent);
  });

  it("returns completed for completed view", () => {
    expect(getActiveTasks("completed", collections)).toEqual(collections.completed);
  });
});

describe("formatTodayLabel", () => {
  it("returns a non-empty string", () => {
    expect(formatTodayLabel().length).toBeGreaterThan(0);
  });

  it("includes the current month name in Spanish", () => {
    const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const label = formatTodayLabel().toLowerCase();
    expect(months.some((m) => label.includes(m))).toBe(true);
  });
});

describe("isFormDirty", () => {
  it("returns false for initial form", () => {
    expect(isFormDirty(INITIAL_FORM)).toBe(false);
  });

  it("returns true when title is filled", () => {
    expect(isFormDirty({ ...INITIAL_FORM, title: "Mi tarea" })).toBe(true);
  });

  it("returns true when note is filled", () => {
    expect(isFormDirty({ ...INITIAL_FORM, note: "Algo" })).toBe(true);
  });

  it("returns true when dueLabel changed", () => {
    expect(isFormDirty({ ...INITIAL_FORM, dueLabel: "Mañana" })).toBe(true);
  });

  it("returns true when priority changed", () => {
    expect(isFormDirty({ ...INITIAL_FORM, priority: "high" })).toBe(true);
  });

  it("returns true when kind changed", () => {
    expect(isFormDirty({ ...INITIAL_FORM, kind: "persistent" })).toBe(true);
  });

  it("returns false for whitespace-only title", () => {
    expect(isFormDirty({ ...INITIAL_FORM, title: "   " })).toBe(false);
  });
});
