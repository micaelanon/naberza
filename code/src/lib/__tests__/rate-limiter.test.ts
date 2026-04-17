import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
  });

  it("allows requests up to limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check("test-ip");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks requests beyond limit", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("test-ip");
    }
    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("isolates limits by key", () => {
    limiter.check("ip-1");
    limiter.check("ip-1");
    limiter.check("ip-1");

    const result = limiter.check("ip-2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("resets window after expiry", async () => {
    // Exhaust limit
    for (let i = 0; i < 5; i++) {
      limiter.check("test-ip");
    }
    expect(limiter.check("test-ip").allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should allow new requests
    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("reset() clears all data", () => {
    limiter.check("ip-1");
    limiter.check("ip-2");

    limiter.reset();

    expect(limiter.check("ip-1").remaining).toBe(4);
    expect(limiter.check("ip-2").remaining).toBe(4);
  });
});
