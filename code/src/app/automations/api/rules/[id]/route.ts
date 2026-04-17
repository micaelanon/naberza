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
    const rule = await service.getRule(id);
    if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    return NextResponse.json({ data: rule });
  } catch (error) {
    console.error("[Automations API] GET /automations/api/rules/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const rule = await service.updateRule(id, body);
    if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    return NextResponse.json({ data: rule });
  } catch (error) {
    console.error("[Automations API] PATCH /automations/api/rules/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const deleted = await service.deleteRule(id);
    if (!deleted) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[Automations API] DELETE /automations/api/rules/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
