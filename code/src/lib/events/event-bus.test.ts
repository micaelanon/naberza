import { describe, it, expect, vi, beforeEach } from "vitest";

import { EventBus } from "./event-bus";
import type { TaskEvent } from "./event-types";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("calls handler when event is emitted", async () => {
    const handler = vi.fn();
    bus.on("task.created", handler);

    const payload: TaskEvent = {
      timestamp: new Date(),
      actor: { type: "user", id: "user-1" },
      taskId: "task-1",
      title: "Test task",
    };

    await bus.emit("task.created", payload);
    expect(handler).toHaveBeenCalledWith(payload);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls multiple handlers in registration order", async () => {
    const order: number[] = [];
    bus.on("task.created", () => { order.push(1); });
    bus.on("task.created", () => { order.push(2); });
    bus.on("task.created", () => { order.push(3); });

    await bus.emit("task.created", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    expect(order).toEqual([1, 2, 3]);
  });

  it("does nothing when no handlers are registered", async () => {
    // Emitting an event with no handlers should complete without errors
    const result = bus.emit("task.created", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    await expect(result).resolves.toBeUndefined();
  });

  it("catches handler errors without propagating to emitter", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const goodHandler = vi.fn();

    bus.on("task.created", () => { throw new Error("handler exploded"); });
    bus.on("task.created", goodHandler);

    await bus.emit("task.created", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    // The second handler should still be called despite the first throwing
    expect(goodHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EventBus] Error in handler for "task.created"'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("handles async handlers", async () => {
    const results: string[] = [];

    bus.on("task.completed", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push("async-done");
    });

    await bus.emit("task.completed", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    expect(results).toEqual(["async-done"]);
  });

  it("unsubscribe removes the handler", async () => {
    const handler = vi.fn();
    const sub = bus.on("task.created", handler);

    sub.unsubscribe();

    await bus.emit("task.created", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("clear removes all handlers", async () => {
    bus.on("task.created", vi.fn());
    bus.on("task.completed", vi.fn());

    expect(bus.listenerCount("task.created")).toBe(1);
    expect(bus.listenerCount("task.completed")).toBe(1);

    bus.clear();

    expect(bus.listenerCount("task.created")).toBe(0);
    expect(bus.listenerCount("task.completed")).toBe(0);
  });

  it("listenerCount returns correct count", () => {
    expect(bus.listenerCount("task.created")).toBe(0);

    bus.on("task.created", vi.fn());
    bus.on("task.created", vi.fn());

    expect(bus.listenerCount("task.created")).toBe(2);
    expect(bus.listenerCount("task.completed")).toBe(0);
  });

  it("only calls handlers for the matching event", async () => {
    const createdHandler = vi.fn();
    const completedHandler = vi.fn();

    bus.on("task.created", createdHandler);
    bus.on("task.completed", completedHandler);

    await bus.emit("task.created", {
      timestamp: new Date(),
      actor: { type: "system" },
      taskId: "t-1",
      title: "Test",
    });

    expect(createdHandler).toHaveBeenCalledTimes(1);
    expect(completedHandler).not.toHaveBeenCalled();
  });
});
