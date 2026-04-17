import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../circuit-breaker";

describe("CircuitBreaker — CLOSED state", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    cb = new CircuitBreaker({ name: "test", failureThreshold: 3, successThreshold: 2, openDurationMs: 1000 });
  });

  it("starts in CLOSED state", () => {
    expect(cb.getState()).toBe("CLOSED");
  });

  it("executes fn and returns result when CLOSED", async () => {
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.getState()).toBe("CLOSED");
  });

  it("transitions to OPEN after failureThreshold failures", async () => {
    const fn = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fn)).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("OPEN");
  });

  it("resets failure count on success", async () => {
    await expect(cb.execute(() => Promise.reject(new Error("x")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("x")))).rejects.toThrow();
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("CLOSED");
  });
});

describe("CircuitBreaker — OPEN state", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cb = new CircuitBreaker({ name: "test", failureThreshold: 2, successThreshold: 2, openDurationMs: 500 });
  });

  it("throws CircuitBreakerOpenError immediately when OPEN", async () => {
    const fn = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(fn)).rejects.toThrow();
    await expect(cb.execute(fn)).rejects.toThrow();

    expect(cb.getState()).toBe("OPEN");
    await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toBeInstanceOf(CircuitBreakerOpenError);
  });

  it("transitions to HALF_OPEN after openDurationMs", async () => {
    const fn = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(fn)).rejects.toThrow();
    await expect(cb.execute(fn)).rejects.toThrow();

    vi.advanceTimersByTime(600);
    await cb.execute(() => Promise.resolve("ok")).catch(() => null);
    expect(cb.getState()).not.toBe("OPEN");
  });
});

describe("CircuitBreaker — HALF_OPEN state", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cb = new CircuitBreaker({ name: "test", failureThreshold: 2, successThreshold: 2, openDurationMs: 500 });
  });

  it("closes after successThreshold successes in HALF_OPEN", async () => {
    const fail = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    vi.advanceTimersByTime(600);

    await cb.execute(() => Promise.resolve("ok"));
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("CLOSED");
  });

  it("re-opens on failure in HALF_OPEN", async () => {
    const fail = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    vi.advanceTimersByTime(600);

    await expect(cb.execute(fail)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");
  });

  it("reset() returns to CLOSED", () => {
    cb.reset();
    expect(cb.getState()).toBe("CLOSED");
  });
});
