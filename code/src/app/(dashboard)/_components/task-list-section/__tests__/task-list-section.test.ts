import { describe, it, expect } from "vitest";

import type { TaskItem } from "@/lib/tasks";
import { getChannelLabel, getListChipLabel, getPriorityLabel } from "../utils/helpers";

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

describe("getChannelLabel", () => {
  it("returns 'Personal' for dashboard channel", () => {
    expect(getChannelLabel("dashboard")).toBe("Personal");
  });

  it("returns 'Telegram' for telegram channel", () => {
    expect(getChannelLabel("telegram")).toBe("Telegram");
  });
});

describe("getPriorityLabel", () => {
  it("returns 'Prioridad' for high", () => {
    expect(getPriorityLabel("high")).toBe("Prioridad");
  });

  it("returns 'Seguimiento' for medium", () => {
    expect(getPriorityLabel("medium")).toBe("Seguimiento");
  });

  it("returns 'Rutina' for low", () => {
    expect(getPriorityLabel("low")).toBe("Rutina");
  });
});

describe("getListChipLabel", () => {
  it("returns 'Persistente' for persistent kind", () => {
    expect(getListChipLabel(makeTask({ kind: "persistent" }))).toBe("Persistente");
  });

  it("returns channel label for normal kind", () => {
    expect(getListChipLabel(makeTask({ kind: "normal", channel: "dashboard" }))).toBe("Personal");
    expect(getListChipLabel(makeTask({ kind: "normal", channel: "telegram" }))).toBe("Telegram");
  });
});
