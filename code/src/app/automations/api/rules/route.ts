import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { AutomationService } from "@/modules/automations/automation.service";
import type { CreateAutomationRuleInput, RuleCondition, RuleAction } from "@/modules/automations";

const repository = new AutomationRepository();
const service = new AutomationService(repository);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const enabled = searchParams.has("enabled") ? searchParams.get("enabled") === "true" : undefined;
  const triggerEvent = searchParams.get("triggerEvent") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listRules({ enabled, triggerEvent, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Automations API] GET /automations/api/rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validateRuleBody(body: Record<string, unknown>): string | null {
  if (typeof body.name !== "string" || !body.name.trim()) return "name is required";
  if (typeof body.triggerEvent !== "string" || !body.triggerEvent.trim()) return "triggerEvent is required";
  if (!Array.isArray(body.conditions)) return "conditions must be an array";
  if (!Array.isArray(body.actions)) return "actions must be an array";
  return null;
}

function buildRuleInput(body: Record<string, unknown>): CreateAutomationRuleInput {
  return {
    name: (body.name as string).trim(),
    description: typeof body.description === "string" ? body.description : undefined,
    triggerEvent: body.triggerEvent as CreateAutomationRuleInput["triggerEvent"],
    conditions: (body.conditions as RuleCondition[]),
    actions: (body.actions as RuleAction[]),
    requiresApproval: typeof body.requiresApproval === "boolean" ? body.requiresApproval : undefined,
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    priority: typeof body.priority === "number" ? body.priority : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateRuleBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const rule = await service.createRule(buildRuleInput(body));
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    console.error("[Automations API] POST /automations/api/rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
