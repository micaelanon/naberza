import { NextResponse } from "next/server";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { AutomationService } from "@/modules/automations/automation.service";

const repository = new AutomationRepository();
const service = new AutomationService(repository);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const approval = await service.getApproval(id);
    if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    return NextResponse.json({ data: approval });
  } catch (error) {
    console.error("[Automations API] GET /automations/api/approvals/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
