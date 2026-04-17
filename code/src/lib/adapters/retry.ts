/**
 * Retry utility with exponential backoff and optional jitter.
 * Use to wrap external adapter calls that may fail transiently.
 */

export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  retryOn?: (error: unknown) => boolean;
}

const RETRY_DEFAULTS = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  factor: 2,
};

// Using crypto.getRandomValues for SonarJS compliance (sonarjs/pseudo-random)
function safeRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / 0xffffffff;
}

function computeDelay(attempt: number, config: Required<Omit<RetryConfig, "retryOn">>): number {
  const base = config.baseDelayMs * Math.pow(config.factor, attempt);
  const jitter = 0.75 + safeRandom() * 0.5; // 0.75–1.25
  return Math.min(base * jitter, config.maxDelayMs);
}

function shouldRetry(error: unknown, retryOn?: (error: unknown) => boolean): boolean {
  if (retryOn) {
    return retryOn(error);
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const resolved = { ...RETRY_DEFAULTS, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < resolved.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLast = attempt === resolved.maxAttempts - 1;
      if (isLast || !shouldRetry(error, config.retryOn)) {
        throw error;
      }

      const delay = computeDelay(attempt, resolved);
      await sleep(delay);
    }
  }

  throw lastError;
}
