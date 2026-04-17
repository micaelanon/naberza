import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { AutomationService } from "@/modules/automations/automation.service";
import type { ApprovalStatus } from "@/modules/automations";

const repository = new AutomationRepository();
const service = new AutomationService(repository);

const VALID_STATUSES = new Set<ApprovalStatus>(["PENDING", "APPROVED", "DENIED", "EXPIRED"]);

function parseStatus(raw: string | null): ApprovalStatus | undefined {
  if (raw && VALID_STATUSES.has(raw as ApprovalStatus)) return raw as ApprovalStatus;
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));
  const automationRuleId = searchParams.get("ruleId") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listApprovals({ status, automationRuleId, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Automations API] GET /automations/api/approvals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
