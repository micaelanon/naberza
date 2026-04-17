import type { AutomationRule, ApprovalRequest, ApprovalStatus } from "@prisma/client";
import type { DomainEventName } from "@/lib/events";

export type { ApprovalStatus };
export type { AutomationRule, ApprovalRequest };

// ─── Condition types ──────────────────────────────────────────────────────────

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists";

export interface RuleCondition {
  field: string;           // dot-notation path into event payload, e.g. "sourceType", "amount"
  operator: ConditionOperator;
  value?: unknown;         // not required for exists / not_exists
}

// ─── Action types ─────────────────────────────────────────────────────────────

export type ActionType =
  | "create_task"
  | "create_inbox_item"
  | "send_notification"
  | "mark_invoice_paid"
  | "flag_finance_anomaly"
  | "archive_idea"
  | "webhook_call";

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

// ─── Rule input/update types ──────────────────────────────────────────────────

export interface CreateAutomationRuleInput {
  name: string;
  description?: string;
  triggerEvent: DomainEventName;
  conditions: RuleCondition[];
  actions: RuleAction[];
  requiresApproval?: boolean;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  triggerEvent?: DomainEventName;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  requiresApproval?: boolean;
  enabled?: boolean;
  priority?: number;
}

export interface ListAutomationRulesOptions {
  enabled?: boolean;
  triggerEvent?: string;
  limit?: number;
  offset?: number;
}

// ─── Approval types ───────────────────────────────────────────────────────────

export interface CreateApprovalRequestInput {
  automationRuleId: string;
  triggerEventPayload: Record<string, unknown>;
  proposedActions: RuleAction[];
  expiresAt: Date;
}

export interface ListApprovalRequestsOptions {
  status?: ApprovalStatus;
  automationRuleId?: string;
  limit?: number;
  offset?: number;
}

// ─── Rule evaluation types ────────────────────────────────────────────────────

export interface RuleEvaluationContext {
  eventName: DomainEventName;
  payload: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  rule: AutomationRule;
  matched: boolean;
  conditionResults: Array<{ condition: RuleCondition; passed: boolean }>;
}

export interface ActionExecutionResult {
  action: RuleAction;
  success: boolean;
  output?: unknown;
  error?: string;
}

// ─── View types ───────────────────────────────────────────────────────────────

export interface AutomationRuleSummary {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  conditionCount: number;
  actionCount: number;
  requiresApproval: boolean;
  enabled: boolean;
  priority: number;
  executionCount: number;
  lastTriggeredAt: Date | null;
}

export interface ApprovalRequestSummary {
  id: string;
  automationRuleId: string;
  automationRuleName: string;
  status: ApprovalStatus;
  proposedActions: RuleAction[];
  expiresAt: Date;
  createdAt: Date;
}
