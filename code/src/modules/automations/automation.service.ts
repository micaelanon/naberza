import { eventBus } from "@/lib/events";
import type { DomainEventName } from "@/lib/events";
import type { AutomationRepository } from "./automation.repository";
import { AutomationRepository as Repo } from "./automation.repository";
import type {
  AutomationRule,
  ApprovalRequest,
  AutomationRuleSummary,
  ApprovalRequestSummary,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
  ListAutomationRulesOptions,
  ListApprovalRequestsOptions,
  RuleCondition,
  RuleAction,
  RuleEvaluationContext,
  RuleEvaluationResult,
  ActionExecutionResult,
} from "./automation.types";

// ─── Condition evaluator ──────────────────────────────────────────────────────

function getFieldValue(payload: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object") return (obj as Record<string, unknown>)[key];
    return undefined;
  }, payload);
}

function evaluateNumeric(
  operator: RuleCondition["operator"],
  value: unknown,
  expected: unknown,
): boolean {
  if (typeof value !== "number" || typeof expected !== "number") return false;
  if (operator === "gt") return value > expected;
  if (operator === "gte") return value >= expected;
  if (operator === "lt") return value < expected;
  if (operator === "lte") return value <= expected;
  return false;
}

function evaluateString(
  operator: RuleCondition["operator"],
  value: unknown,
  expected: unknown,
): boolean {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  if (operator === "contains") return value.includes(expected);
  if (operator === "not_contains") return !value.includes(expected);
  if (operator === "starts_with") return value.startsWith(expected);
  return false;
}

function evaluateArrayOp(operator: RuleCondition["operator"], value: unknown, expected: unknown): boolean {
  if (!Array.isArray(expected)) return false;
  if (operator === "in") return expected.includes(value);
  if (operator === "not_in") return !expected.includes(value);
  return false;
}

function evaluateSimple(operator: RuleCondition["operator"], value: unknown, expected: unknown): boolean | null {
  if (operator === "eq") return value === expected;
  if (operator === "neq") return value !== expected;
  if (operator === "exists") return value !== undefined && value !== null;
  if (operator === "not_exists") return value === undefined || value === null;
  return null; // not handled here
}

const NUMERIC_OPS = new Set(["gt", "gte", "lt", "lte"]);
const STRING_OPS = new Set(["contains", "not_contains", "starts_with"]);

function evaluateCondition(condition: RuleCondition, payload: Record<string, unknown>): boolean {
  const value = getFieldValue(payload, condition.field);
  const { operator, value: expected } = condition;
  const simple = evaluateSimple(operator, value, expected);
  if (simple !== null) return simple;
  if (operator === "in" || operator === "not_in") return evaluateArrayOp(operator, value, expected);
  if (NUMERIC_OPS.has(operator)) return evaluateNumeric(operator, value, expected);
  if (STRING_OPS.has(operator)) return evaluateString(operator, value, expected);
  return false;
}

// ─── AutomationService ────────────────────────────────────────────────────────

export class AutomationService {
  constructor(private readonly repository: AutomationRepository) {}

  // ─── Rule CRUD ───────────────────────────────────────────────────────────────

  async getRule(id: string): Promise<AutomationRule | null> {
    return this.repository.findRuleById(id);
  }

  async listRules(options: ListAutomationRulesOptions = {}): Promise<{
    items: AutomationRuleSummary[];
    total: number;
  }> {
    const [rules, total] = await Promise.all([
      this.repository.listRules(options),
      this.repository.countRules({ enabled: options.enabled, triggerEvent: options.triggerEvent }),
    ]);

    const items: AutomationRuleSummary[] = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      triggerEvent: rule.triggerEvent,
      conditionCount: (rule.conditions as unknown[]).length,
      actionCount: (rule.actions as unknown[]).length,
      requiresApproval: rule.requiresApproval,
      enabled: rule.enabled,
      priority: rule.priority,
      executionCount: rule.executionCount,
      lastTriggeredAt: rule.lastTriggeredAt,
    }));

    return { items, total };
  }

  async createRule(input: CreateAutomationRuleInput): Promise<AutomationRule> {
    const rule = await this.repository.createRule(input);

    await eventBus.emit("automation.rule.matched", {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerEvent: rule.triggerEvent,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return rule;
  }

  async updateRule(id: string, input: UpdateAutomationRuleInput): Promise<AutomationRule | null> {
    const existing = await this.repository.findRuleById(id);
    if (!existing) return null;
    return this.repository.updateRule(id, input);
  }

  async deleteRule(id: string): Promise<boolean> {
    const existing = await this.repository.findRuleById(id);
    if (!existing) return false;
    await this.repository.deleteRule(id);
    return true;
  }

  // ─── Rule evaluation ──────────────────────────────────────────────────────────

  async evaluateRules(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const rules = await this.repository.findEnabledRulesForEvent(context.eventName);
    return rules.map((rule) => this.evaluateRule(rule, context));
  }

  evaluateRule(rule: AutomationRule, context: RuleEvaluationContext): RuleEvaluationResult {
    const conditions = Repo.parseConditions(rule);
    const conditionResults = conditions.map((condition) => ({
      condition,
      passed: evaluateCondition(condition, context.payload),
    }));
    const matched = conditionResults.length === 0 || conditionResults.every((r) => r.passed);
    return { rule, matched, conditionResults };
  }

  // ─── Event processing ─────────────────────────────────────────────────────────

  async processEvent(eventName: DomainEventName, payload: Record<string, unknown>): Promise<void> {
    const context: RuleEvaluationContext = { eventName, payload };
    const results = await this.evaluateRules(context);

    for (const result of results) {
      if (!result.matched) continue;

      const { rule } = result;
      await this.repository.recordTrigger(rule.id);

      if (rule.requiresApproval) {
        await this.createApprovalRequest(rule, payload);
      } else {
        await this.executeRule(rule, payload);
      }
    }
  }

  private async createApprovalRequest(
    rule: AutomationRule,
    payload: Record<string, unknown>,
  ): Promise<ApprovalRequest> {
    const actions = Repo.parseActions(rule);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

    const approval = await this.repository.createApproval({
      automationRuleId: rule.id,
      triggerEventPayload: payload,
      proposedActions: actions,
      expiresAt,
    });

    await eventBus.emit("automation.approval.requested", {
      approvalId: approval.id,
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return approval;
  }

  private async executeRule(
    rule: AutomationRule,
    payload: Record<string, unknown>,
  ): Promise<ActionExecutionResult[]> {
    const actions = Repo.parseActions(rule);
    const results: ActionExecutionResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action, payload);
      results.push(result);
    }

    const success = results.every((r) => r.success);
    await eventBus.emit("automation.action.executed", {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerEvent: rule.triggerEvent,
      actionType: actions.map((a) => a.type).join(","),
      result: success ? "success" : "failure",
      error: results.find((r) => !r.success)?.error,
      timestamp: new Date(),
      actor: { type: "automation", ruleId: rule.id, ruleName: rule.name },
    });

    return results;
  }

  private async executeAction(
    action: RuleAction,
    payload: Record<string, unknown>,
  ): Promise<ActionExecutionResult> {
    try {
      // Action execution is delegated to specific handlers in Phase 5 sub-tasks.
      // For now, we log the intent and return success — real dispatchers
      // will be wired in P5-03 (rule engine handlers).
      console.info(`[AutomationService] Executing action: ${action.type}`, action.params, { payload });
      return { action, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[AutomationService] Action failed: ${action.type}`, error);
      return { action, success: false, error: message };
    }
  }

  // ─── Approval CRUD ────────────────────────────────────────────────────────────

  async getApproval(id: string): Promise<ApprovalRequest | null> {
    return this.repository.findApprovalById(id);
  }

  async listApprovals(options: ListApprovalRequestsOptions = {}): Promise<{
    items: ApprovalRequestSummary[];
    total: number;
  }> {
    const [approvals, total] = await Promise.all([
      this.repository.listApprovals(options),
      this.repository.countApprovals({ status: options.status, automationRuleId: options.automationRuleId }),
    ]);

    const items: ApprovalRequestSummary[] = approvals.map((a) => ({
      id: a.id,
      automationRuleId: a.automationRuleId,
      automationRuleName: "",  // populated below if needed via include
      status: a.status,
      proposedActions: Repo.parseApprovalActions(a),
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
    }));

    return { items, total };
  }

  async grantApproval(id: string): Promise<ApprovalRequest | null> {
    const approval = await this.repository.findApprovalWithRule(id);
    if (!approval) return null;
    if (approval.status !== "PENDING") return null;

    const updated = await this.repository.updateApprovalStatus(id, "APPROVED");

    await eventBus.emit("automation.approval.granted", {
      approvalId: approval.id,
      ruleId: approval.automationRule.id,
      ruleName: approval.automationRule.name,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    // Execute the approved actions
    const payload = approval.triggerEventPayload as Record<string, unknown>;
    await this.executeRule(approval.automationRule, payload);

    return updated;
  }

  async denyApproval(id: string, reason?: string): Promise<ApprovalRequest | null> {
    const approval = await this.repository.findApprovalById(id);
    if (!approval) return null;
    if (approval.status !== "PENDING") return null;

    const updated = await this.repository.updateApprovalStatus(id, "DENIED", reason);

    const rule = await this.repository.findRuleById(approval.automationRuleId);
    if (rule) {
      await eventBus.emit("automation.approval.denied", {
        approvalId: approval.id,
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: new Date(),
        actor: { type: "system" },
      });
    }

    return updated;
  }

  async expireStaleApprovals(): Promise<number> {
    return this.repository.expireStaleApprovals();
  }

  // ─── Summary helpers ──────────────────────────────────────────────────────────

  toRuleSummary(rule: AutomationRule): AutomationRuleSummary {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      triggerEvent: rule.triggerEvent,
      conditionCount: (rule.conditions as unknown[]).length,
      actionCount: (rule.actions as unknown[]).length,
      requiresApproval: rule.requiresApproval,
      enabled: rule.enabled,
      priority: rule.priority,
      executionCount: rule.executionCount,
      lastTriggeredAt: rule.lastTriggeredAt,
    };
  }
}
