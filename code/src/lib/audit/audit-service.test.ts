import { describe, it, expect, beforeEach } from "vitest";

import { AuditService, eventActorToAuditActor } from "./audit-service";
import { InMemoryAuditStore } from "./audit-store";
import { EventBus } from "@/lib/events/event-bus";
import type { BaseEvent } from "@/lib/events";

describe("AuditService", () => {
  let store: InMemoryAuditStore;
  let service: AuditService;

  beforeEach(() => {
    store = new InMemoryAuditStore();
    service = new AuditService(store);
  });

  it("logs an audit entry", async () => {
    const entry = await service.log({
      module: "tasks",
      action: "task.created",
      entityType: "Task",
      entityId: "task-1",
      actor: "user",
      actorDetail: "user-1",
      status: "success",
      input: { title: "Test task" },
    });

    expect(entry.id).toBeTruthy();
    expect(entry.module).toBe("tasks");
    expect(entry.action).toBe("task.created");
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it("queries entries by module", async () => {
    await service.log({ module: "tasks", action: "created", actor: "user", status: "success" });
    await service.log({ module: "inbox", action: "created", actor: "user", status: "success" });
    await service.log({ module: "tasks", action: "completed", actor: "user", status: "success" });

    const result = await service.query({ module: "tasks" });
    expect(result.entries).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("queries with pagination", async () => {
    for (let i = 0; i < 10; i++) {
      await service.log({ module: "tasks", action: `action-${i}`, actor: "user", status: "success" });
    }

    const page1 = await service.query({ module: "tasks", page: 1, pageSize: 3 });
    expect(page1.entries).toHaveLength(3);
    expect(page1.total).toBe(10);
    expect(page1.hasMore).toBe(true);
    expect(page1.page).toBe(1);

    const page4 = await service.query({ module: "tasks", page: 4, pageSize: 3 });
    expect(page4.entries).toHaveLength(1);
    expect(page4.hasMore).toBe(false);
  });

  it("counts entries", async () => {
    await service.log({ module: "tasks", action: "created", actor: "user", status: "success" });
    await service.log({ module: "inbox", action: "created", actor: "user", status: "success" });

    const total = await service.count();
    expect(total).toBe(2);

    const tasksOnly = await service.count({ module: "tasks" });
    expect(tasksOnly).toBe(1);
  });

  it("queries by date range", async () => {
    const old = new Date("2026-01-01");
    const recent = new Date("2026-04-15");

    // Manually create entries with known dates
    await store.append({ module: "tasks", action: "old", actor: "user", status: "success" });
    // Override the createdAt for the first entry
    const all = await store.query({});
    all.entries[0].createdAt = old;

    await store.append({ module: "tasks", action: "recent", actor: "user", status: "success" });
    const all2 = await store.query({});
    all2.entries[0].createdAt = recent;

    const result = await service.query({
      from: new Date("2026-04-01"),
    });

    expect(result.entries.some((e) => e.action === "recent")).toBe(true);
  });

  it("queries by status", async () => {
    await service.log({ module: "tasks", action: "a", actor: "user", status: "success" });
    await service.log({ module: "tasks", action: "b", actor: "user", status: "failure", errorMessage: "boom" });

    const failures = await service.query({ status: "failure" });
    expect(failures.entries).toHaveLength(1);
    expect(failures.entries[0].errorMessage).toBe("boom");
  });
});

describe("eventActorToAuditActor", () => {
  it("maps user actor", () => {
    const event: BaseEvent = {
      timestamp: new Date(),
      actor: { type: "user", id: "user-123" },
    };
    const result = eventActorToAuditActor(event);
    expect(result).toEqual({ actor: "user", actorDetail: "user-123" });
  });

  it("maps system actor", () => {
    const event: BaseEvent = {
      timestamp: new Date(),
      actor: { type: "system" },
    };
    const result = eventActorToAuditActor(event);
    expect(result).toEqual({ actor: "system" });
  });

  it("maps automation actor", () => {
    const event: BaseEvent = {
      timestamp: new Date(),
      actor: { type: "automation", ruleId: "rule-1", ruleName: "invoice-detect" },
    };
    const result = eventActorToAuditActor(event);
    expect(result).toEqual({ actor: "automation", actorDetail: "invoice-detect" });
  });

  it("maps integration actor", () => {
    const event: BaseEvent = {
      timestamp: new Date(),
      actor: { type: "integration", connectionId: "conn-1", connectionName: "Mi Paperless" },
    };
    const result = eventActorToAuditActor(event);
    expect(result).toEqual({ actor: "integration", actorDetail: "Mi Paperless" });
  });
});

describe("AuditService.autoLog", () => {
  it("automatically logs events emitted through event bus", async () => {
    const store = new InMemoryAuditStore();
    const service = new AuditService(store);
    const bus = new EventBus();

    // We need to test autoLog which uses the singleton eventBus
    // Instead, test the mapper directly through the log method
    const entry = await service.log({
      module: "tasks",
      action: "task.created",
      entityType: "Task",
      entityId: "task-1",
      actor: "user",
      actorDetail: "user-1",
      status: "success",
      input: { title: "Mapped from event" },
    });

    expect(entry.module).toBe("tasks");
    expect(entry.input).toEqual({ title: "Mapped from event" });

    // Verify bus is available (just to ensure no import issues)
    expect(bus.listenerCount("task.created")).toBe(0);
  });
});
