/**
 * Health check service — probes database and optional external dependencies.
 */

import type { DependencyHealth, HealthReport, HealthStatus } from "./health.types";

const startTime = Date.now();

async function checkDatabase(): Promise<DependencyHealth> {
  const start = Date.now();
  try {
    // Lazy import to avoid initializing Prisma at module load in test env
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      name: "database",
      status: "error",
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }
}

function checkEnvFlag(name: string, envVar: string | undefined): DependencyHealth {
  return {
    name,
    status: envVar ? "ok" : "degraded",
    detail: envVar ? undefined : `${name.toUpperCase()} env var not configured`,
  };
}

function deriveOverallStatus(dependencies: DependencyHealth[]): HealthStatus {
  const hasError = dependencies.some((d) => d.status === "error");
  const hasDegraded = dependencies.some((d) => d.status === "degraded");
  if (hasError) return "error";
  if (hasDegraded) return "degraded";
  return "ok";
}

export async function buildHealthReport(version: string): Promise<HealthReport> {
  const [dbHealth, telegramHealth, smtpHealth] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkEnvFlag("telegram", process.env.TELEGRAM_BOT_TOKEN)),
    Promise.resolve(checkEnvFlag("smtp", process.env.SMTP_HOST)),
  ]);

  const dependencies = [dbHealth, telegramHealth, smtpHealth];

  return {
    status: deriveOverallStatus(dependencies),
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    dependencies,
  };
}
