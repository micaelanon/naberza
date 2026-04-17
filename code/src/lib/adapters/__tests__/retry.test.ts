import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry } from "../retry";

describe("withRetry — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves immediately when fn succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves after one failure and one success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withRetry — failure path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent failure"));
    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 }),
    ).rejects.toThrow("persistent failure");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry when retryOn predicate returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("no retry"));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, retryOn: () => false }),
    ).rejects.toThrow("no retry");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries only errors matching predicate", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockRejectedValueOnce(new Error("fatal"));

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        retryOn: (e) => (e as Error).message === "transient",
      }),
    ).rejects.toThrow("fatal");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
