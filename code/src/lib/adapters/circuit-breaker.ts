/**
 * Circuit breaker pattern for external adapter calls.
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker is OPEN for: ${name}`);
    this.name = "CircuitBreakerOpenError";
  }
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  openDurationMs?: number;
}

const CIRCUIT_DEFAULTS = {
  failureThreshold: 5,
  successThreshold: 2,
  openDurationMs: 30000,
};

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private openedAt: number | null = null;
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = { ...CIRCUIT_DEFAULTS, ...config };
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = null;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpen();

    if (this.state === "OPEN") {
      throw new CircuitBreakerOpenError(this.config.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private maybeTransitionFromOpen(): void {
    if (this.state !== "OPEN" || this.openedAt === null) return;
    const elapsed = Date.now() - this.openedAt;
    if (elapsed >= this.config.openDurationMs) {
      this.state = "HALF_OPEN";
      this.successCount = 0;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount += 1;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.openedAt = null;
      }
    }
  }

  private onFailure(): void {
    this.failureCount += 1;
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.openedAt = Date.now();
      return;
    }
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();
    }
  }
}
