import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { eventBus } from "@/lib/events";
import { AutomationService } from "@/modules/automations/automation.service";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import type { AutomationRule } from "@/modules/automations/automation.types";
import type { DomainEventName, Subscription } from "@/lib/events";

// ─── Action dispatcher mock ───────────────────────────────────────────────────
// We stub dispatchAction to avoid real cross-module calls.

const mockDispatchAction = vi.hoisted(() => vi.fn());

vi.mock("@/modules/automations/action-dispatcher", () => ({
  dispatchAction: mockDispatchAction,
}));

// ─── Repository mock ──────────────────────────────────────────────────────────

const repositoryMock = vi.hoisted(() => ({
  findRuleById: vi.fn(),
  listRules: vi.fn(),
  countRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
  recordTrigger: vi.fn(),
  findEnabledRulesForEvent: vi.fn(),
  findApprovalById: vi.fn(),
  listApprovals: vi.fn(),
  countApprovals: vi.fn(),
  createApproval: vi.fn(),
  updateApprovalStatus: vi.fn(),
  expireStaleApprovals: vi.fn(),
  findApprovalWithRule: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: "rule-eng-1",
    name: "Create inbox on large expense",
    description: null,
    triggerEvent: "finance.entry.created" as DomainEventName,
    conditions: [{ field: "amount", operator: "gt", value: 500 }] as never,
    actions: [{ type: "create_inbox_item", params: { title: "Large expense" } }] as never,
    requiresApproval: false,
    enabled: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AutomationRule;
}

const defaultAction = {
  type: "create_inbox_item",
  params: { title: "Large expense" },
};

function makeApproval(ruleId: string) {
  return {
    id: "approval-eng-1",
    automationRuleId: ruleId,
    triggerEventPayload: {},
    proposedActions: [],
    status: "PENDING",
    expiresAt: new Date(Date.now() + 86400000),
    decidedAt: null,
    decidedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Automation engine integration — event → evaluation → action", () => {
  let service: AutomationService;
  const emittedEvents: string[] = [];
  const subscriptions: Subscription[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    emittedEvents.length = 0;
    service = new AutomationService(repositoryMock as unknown as AutomationRepository);

    repositoryMock.recordTrigger.mockResolvedValue(undefined);
    repositoryMock.createApproval.mockResolvedValue(makeApproval("rule-eng-1"));

    const s1 = eventBus.on("automation.rule.matched", () => {
      emittedEvents.push("automation.rule.matched");
    });
    const s2 = eventBus.on("automation.action.executed", () => {
      emittedEvents.push("automation.action.executed");
    });
    const s3 = eventBus.on("automation.approval.requested", () => {
      emittedEvents.push("automation.approval.requested");
    });
    subscriptions.push(s1, s2, s3);
  });

  afterEach(() => {
    subscriptions.forEach((s) => s.unsubscribe());
    subscriptions.length = 0;
    eventBus.clear();
  });

  it("dispatches action when rule matches and no approval required", async () => {
    const rule = makeRule();
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);
    mockDispatchAction.mockResolvedValue({ action: defaultAction, success: true });

    await service.processEvent("finance.entry.created", { amount: 600, currency: "EUR" });

    expect(mockDispatchAction).toHaveBeenCalledOnce();
    expect(repositoryMock.recordTrigger).toHaveBeenCalledWith("rule-eng-1");
  });

  it("emits automation.action.executed after executing actions", async () => {
    const rule = makeRule();
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);
    mockDispatchAction.mockResolvedValue({ action: defaultAction, success: true });

    await service.processEvent("finance.entry.created", { amount: 600 });

    expect(emittedEvents).toContain("automation.action.executed");
  });

  it("does not dispatch action when rule does not match conditions", async () => {
    const rule = makeRule();
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);

    await service.processEvent("finance.entry.created", { amount: 100 }); // below threshold

    expect(mockDispatchAction).not.toHaveBeenCalled();
    expect(repositoryMock.recordTrigger).not.toHaveBeenCalled();
  });

  it("does not dispatch action when no rules for event", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([]);

    await service.processEvent("finance.entry.created", { amount: 999 });

    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it("creates approval request instead of dispatching when requiresApproval=true", async () => {
    const rule = makeRule({ requiresApproval: true });
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);

    await service.processEvent("finance.entry.created", { amount: 600 });

    expect(mockDispatchAction).not.toHaveBeenCalled();
    expect(repositoryMock.createApproval).toHaveBeenCalledOnce();
  });

  it("emits automation.approval.requested when approval required", async () => {
    const rule = makeRule({ requiresApproval: true });
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);

    await service.processEvent("finance.entry.created", { amount: 600 });

    expect(emittedEvents).toContain("automation.approval.requested");
  });

  it("processes multiple matching rules in sequence", async () => {
    const rule1 = makeRule({ id: "rule-a", name: "Rule A" });
    const rule2 = makeRule({ id: "rule-b", name: "Rule B" });
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule1, rule2]);
    repositoryMock.recordTrigger.mockResolvedValue(undefined);
    mockDispatchAction.mockResolvedValue({ success: true });

    await service.processEvent("finance.entry.created", { amount: 600 });

    expect(mockDispatchAction).toHaveBeenCalledTimes(2);
    expect(repositoryMock.recordTrigger).toHaveBeenCalledWith("rule-a");
    expect(repositoryMock.recordTrigger).toHaveBeenCalledWith("rule-b");
  });

  it("marks action.executed result as failure when dispatcher returns failure", async () => {
    const rule = makeRule();
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([rule]);
    mockDispatchAction.mockResolvedValue({ action: defaultAction, success: false, error: "Service down" });

    await service.processEvent("finance.entry.created", { amount: 600 });

    const executedEvents = emittedEvents.filter((e) => e === "automation.action.executed");
    expect(executedEvents).toHaveLength(1);
  });

  it("evaluateRule returns matched=false when conditions not met", () => {
    const rule = makeRule();
    const result = service.evaluateRule(rule, {
      eventName: "finance.entry.created",
      payload: { amount: 100 },
    });
    expect(result.matched).toBe(false);
    expect(result.conditionResults[0].passed).toBe(false);
  });

  it("evaluateRule returns matched=true when all conditions pass", () => {
    const rule = makeRule();
    const result = service.evaluateRule(rule, {
      eventName: "finance.entry.created",
      payload: { amount: 700 },
    });
    expect(result.matched).toBe(true);
    expect(result.conditionResults[0].passed).toBe(true);
  });

  it("evaluateRule with no conditions always matches", () => {
    const rule = makeRule({ conditions: [] as never });
    const result = service.evaluateRule(rule, {
      eventName: "inbox.item.created",
      payload: {},
    });
    expect(result.matched).toBe(true);
  });
});
