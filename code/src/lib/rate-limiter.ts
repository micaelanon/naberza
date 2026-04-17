/**
 * Rate limiter — in-memory store for request throttling.
 * Tracks requests by IP address with configurable window and limits.
 */

export interface RateLimitConfig {
  windowMs: number; // window duration in ms
  maxRequests: number; // max requests per window
  keyPrefix?: string; // key prefix for namespacing
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RequestRecord>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = { keyPrefix: "rl:", ...config };
    this.cleanupExpired();
  }

  /**
   * Check if a request should be allowed.
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const prefixedKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();

    let record = this.store.get(prefixedKey);

    if (!record || now > record.resetAt) {
      // Create new window
      record = {
        count: 0,
        resetAt: now + this.config.windowMs,
      };
      this.store.set(prefixedKey, record);
    }

    record.count += 1;
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const allowed = record.count <= this.config.maxRequests;

    return { allowed, remaining, resetAt: record.resetAt };
  }

  /**
   * Reset all stored data (useful for testing)
   */
  reset(): void {
    this.store.clear();
  }

  /**
   * Clean up expired records
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
    // Run cleanup every 60 seconds
    setTimeout(() => this.cleanupExpired(), 60000);
  }
}

// Default singleton: 100 requests per minute per IP
export const defaultRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api:",
});
