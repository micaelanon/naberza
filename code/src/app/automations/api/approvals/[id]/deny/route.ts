import { NextResponse } from "next/server";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { AutomationService } from "@/modules/automations/automation.service";

const repository = new AutomationRepository();
const service = new AutomationService(repository);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let reason: string | undefined;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    reason = typeof body.reason === "string" ? body.reason : undefined;
  } catch {
    // reason is optional — ignore parse failure
  }

  try {
    const approval = await service.denyApproval(id, reason);
    if (!approval) return NextResponse.json({ error: "Approval not found or already decided" }, { status: 404 });
    return NextResponse.json({ data: approval });
  } catch (error) {
    console.error("[Automations API] POST /automations/api/approvals/[id]/deny:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
