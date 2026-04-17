import { prisma } from "@/lib/db";
import type {
  AutomationRule,
  ApprovalRequest,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  ListAutomationRulesOptions,
  CreateApprovalRequestInput,
  ListApprovalRequestsOptions,
  ApprovalStatus,
  RuleCondition,
  RuleAction,
} from "./automation.types";

export class AutomationRepository {
  // ─── Rules ──────────────────────────────────────────────────────────────────

  async findRuleById(id: string): Promise<AutomationRule | null> {
    return prisma.automationRule.findUnique({ where: { id } });
  }

  async listRules(options: ListAutomationRulesOptions = {}): Promise<AutomationRule[]> {
    const { enabled, triggerEvent, limit = 50, offset = 0 } = options;
    return prisma.automationRule.findMany({
      where: {
        ...(enabled !== undefined && { enabled }),
        ...(triggerEvent && { triggerEvent }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: limit,
      skip: offset,
    });
  }

  async countRules(options: Pick<ListAutomationRulesOptions, "enabled" | "triggerEvent"> = {}): Promise<number> {
    const { enabled, triggerEvent } = options;
    return prisma.automationRule.count({
      where: {
        ...(enabled !== undefined && { enabled }),
        ...(triggerEvent && { triggerEvent }),
      },
    });
  }

  async createRule(input: CreateAutomationRuleInput): Promise<AutomationRule> {
    return prisma.automationRule.create({
      data: {
        name: input.name,
        description: input.description,
        triggerEvent: input.triggerEvent,
        conditions: input.conditions as object[],
        actions: input.actions as object[],
        requiresApproval: input.requiresApproval ?? false,
        enabled: input.enabled ?? true,
        priority: input.priority ?? 0,
      },
    });
  }

  async updateRule(id: string, input: UpdateAutomationRuleInput): Promise<AutomationRule> {
    return prisma.automationRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.triggerEvent !== undefined && { triggerEvent: input.triggerEvent }),
        ...(input.conditions !== undefined && { conditions: input.conditions as object[] }),
        ...(input.actions !== undefined && { actions: input.actions as object[] }),
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.priority !== undefined && { priority: input.priority }),
      },
    });
  }

  async deleteRule(id: string): Promise<void> {
    await prisma.automationRule.delete({ where: { id } });
  }

  async recordTrigger(id: string): Promise<void> {
    await prisma.automationRule.update({
      where: { id },
      data: {
        lastTriggeredAt: new Date(),
        executionCount: { increment: 1 },
      },
    });
  }

  async findEnabledRulesForEvent(triggerEvent: string): Promise<AutomationRule[]> {
    return prisma.automationRule.findMany({
      where: { enabled: true, triggerEvent },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  }

  // ─── Approvals ──────────────────────────────────────────────────────────────

  async findApprovalById(id: string): Promise<ApprovalRequest | null> {
    return prisma.approvalRequest.findUnique({ where: { id } });
  }

  async listApprovals(options: ListApprovalRequestsOptions = {}): Promise<ApprovalRequest[]> {
    const { status, automationRuleId, limit = 50, offset = 0 } = options;
    return prisma.approvalRequest.findMany({
      where: {
        ...(status && { status }),
        ...(automationRuleId && { automationRuleId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async countApprovals(options: Pick<ListApprovalRequestsOptions, "status" | "automationRuleId"> = {}): Promise<number> {
    const { status, automationRuleId } = options;
    return prisma.approvalRequest.count({
      where: {
        ...(status && { status }),
        ...(automationRuleId && { automationRuleId }),
      },
    });
  }

  async createApproval(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    return prisma.approvalRequest.create({
      data: {
        automationRuleId: input.automationRuleId,
        triggerEventPayload: input.triggerEventPayload as Parameters<typeof prisma.approvalRequest.create>[0]["data"]["triggerEventPayload"],
        proposedActions: input.proposedActions as object[],
        expiresAt: input.expiresAt,
      },
    });
  }

  async updateApprovalStatus(
    id: string,
    status: ApprovalStatus,
    reason?: string,
  ): Promise<ApprovalRequest> {
    return prisma.approvalRequest.update({
      where: { id },
      data: { status, decidedAt: new Date(), reason },
    });
  }

  async expireStaleApprovals(): Promise<number> {
    const result = await prisma.approvalRequest.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  async findApprovalWithRule(id: string): Promise<(ApprovalRequest & { automationRule: AutomationRule }) | null> {
    return prisma.approvalRequest.findUnique({
      where: { id },
      include: { automationRule: true },
    });
  }

  // ─── Typed accessors ─────────────────────────────────────────────────────────

  static parseConditions(rule: AutomationRule): RuleCondition[] {
    return rule.conditions as unknown as RuleCondition[];
  }

  static parseActions(rule: AutomationRule): RuleAction[] {
    return rule.actions as unknown as RuleAction[];
  }

  static parseApprovalActions(approval: ApprovalRequest): RuleAction[] {
    return approval.proposedActions as unknown as RuleAction[];
  }
}
