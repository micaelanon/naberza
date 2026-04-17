/**
 * GET /api/health
 * Returns system health status with database and integration dependency checks.
 * 200 → ok | degraded; 503 → error
 */

import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/health";
import { getAppVersion } from "@/lib/app-version";

export async function GET(): Promise<NextResponse> {
  const report = await buildHealthReport(getAppVersion());
  const statusCode = report.status === "error" ? 503 : 200;
  return NextResponse.json(report, { status: statusCode });
}
