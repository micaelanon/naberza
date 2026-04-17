/**
 * Health check types for the /api/health endpoint.
 */

export type HealthStatus = "ok" | "degraded" | "error";

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: DependencyHealth[];
}
