import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HomeRepository } from "@/modules/home/home.repository";
import { HomeService } from "@/modules/home/home.service";
import type { HomeSeverity } from "@/modules/home";

const repository = new HomeRepository();
const service = new HomeService(repository);

const VALID_SEVERITIES = new Set<HomeSeverity>(["INFO", "WARNING", "CRITICAL"]);

function parseSeverity(raw: string | null): HomeSeverity | undefined {
  if (raw && VALID_SEVERITIES.has(raw as HomeSeverity)) return raw as HomeSeverity;
  return undefined;
}

function parseAcknowledged(raw: string | null): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get("entity") ?? undefined;
  const severity = parseSeverity(searchParams.get("severity"));
  const acknowledged = parseAcknowledged(searchParams.get("acknowledged"));
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listEvents({ entityId, severity, acknowledged, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Home API] GET /home/api/events:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
