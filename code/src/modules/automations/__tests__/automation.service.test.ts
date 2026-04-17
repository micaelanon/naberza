import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AutomationRule } from "../automation.types";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
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
  },
  eventBusMock: {
    emit: vi.fn(),
  },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { AutomationService } from "../automation.service";
import { AutomationRepository } from "../automation.repository";

const service = new AutomationService(repositoryMock as unknown as AutomationRepository);

function makeRule(overrides: Record<string, unknown> = {}): AutomationRule {
  return {
    id: "rule-1",
    name: "Flag large expense",
    description: "Flag when expense > 500",
    triggerEvent: "finance.entry.created",
    conditions: [{ field: "amount", operator: "gt", value: 500 }],
    actions: [{ type: "create_inbox_item", params: { title: "Large expense detected" } }],
    requiresApproval: false,
    enabled: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as AutomationRule;
}

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    automationRuleId: "rule-1",
    triggerEventPayload: { amount: 600 },
    proposedActions: [{ type: "create_inbox_item", params: {} }],
    status: "PENDING" as const,
    decidedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
    reason: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ─── getRule ──────────────────────────────────────────────────────────────────

describe("AutomationService.getRule", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns rule when found", async () => {
    repositoryMock.findRuleById.mockResolvedValue(makeRule());
    const result = await service.getRule("rule-1");
    expect(result?.id).toBe("rule-1");
  });

  it("returns null when not found", async () => {
    repositoryMock.findRuleById.mockResolvedValue(null);
    const result = await service.getRule("missing");
    expect(result).toBeNull();
  });
});

// ─── listRules ────────────────────────────────────────────────────────────────

describe("AutomationService.listRules", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns items and total", async () => {
    repositoryMock.listRules.mockResolvedValue([makeRule()]);
    repositoryMock.countRules.mockResolvedValue(1);
    const result = await service.listRules();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("maps to summary shape", async () => {
    repositoryMock.listRules.mockResolvedValue([makeRule()]);
    repositoryMock.countRules.mockResolvedValue(1);
    const result = await service.listRules();
    const item = result.items[0];
    expect(item).toMatchObject({
      id: "rule-1",
      name: "Flag large expense",
      conditionCount: 1,
      actionCount: 1,
      enabled: true,
    });
  });
});

// ─── createRule ───────────────────────────────────────────────────────────────

describe("AutomationService.createRule", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("creates rule and emits automation.rule.matched", async () => {
    repositoryMock.createRule.mockResolvedValue(makeRule());
    await service.createRule({
      name: "Test rule",
      triggerEvent: "finance.entry.created",
      conditions: [],
      actions: [],
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "automation.rule.matched",
      expect.objectContaining({ ruleId: "rule-1" }),
    );
  });
});

// ─── updateRule / deleteRule ──────────────────────────────────────────────────

describe("AutomationService.updateRule", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns updated rule", async () => {
    repositoryMock.findRuleById.mockResolvedValue(makeRule());
    repositoryMock.updateRule.mockResolvedValue(makeRule({ name: "Updated" }));
    const result = await service.updateRule("rule-1", { name: "Updated" });
    expect(result?.name).toBe("Updated");
  });

  it("returns null when not found", async () => {
    repositoryMock.findRuleById.mockResolvedValue(null);
    const result = await service.updateRule("missing", { name: "x" });
    expect(result).toBeNull();
  });
});

describe("AutomationService.deleteRule", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true when deleted", async () => {
    repositoryMock.findRuleById.mockResolvedValue(makeRule());
    repositoryMock.deleteRule.mockResolvedValue(undefined);
    const result = await service.deleteRule("rule-1");
    expect(result).toBe(true);
  });

  it("returns false when not found", async () => {
    repositoryMock.findRuleById.mockResolvedValue(null);
    const result = await service.deleteRule("missing");
    expect(result).toBe(false);
  });
});

// ─── evaluateRule ─────────────────────────────────────────────────────────────

describe("AutomationService.evaluateRule", () => {
  const context = { eventName: "finance.entry.created" as const, payload: { amount: 600 } };

  it("matches when all conditions pass", () => {
    const rule = makeRule({ conditions: [{ field: "amount", operator: "gt", value: 500 }] });
    const result = service.evaluateRule(rule, context);
    expect(result.matched).toBe(true);
  });

  it("does not match when condition fails", () => {
    const rule = makeRule({ conditions: [{ field: "amount", operator: "gt", value: 1000 }] });
    const result = service.evaluateRule(rule, context);
    expect(result.matched).toBe(false);
  });

  it("matches when no conditions (always-run rule)", () => {
    const rule = makeRule({ conditions: [] });
    const result = service.evaluateRule(rule, context);
    expect(result.matched).toBe(true);
  });

  it("evaluates eq operator", () => {
    const rule = makeRule({ conditions: [{ field: "type", operator: "eq", value: "EXPENSE" }] });
    const result = service.evaluateRule(rule, { eventName: "finance.entry.created" as const, payload: { type: "EXPENSE" } });
    expect(result.matched).toBe(true);
  });

  it("evaluates contains operator on string", () => {
    const rule = makeRule({ conditions: [{ field: "issuer", operator: "contains", value: "Amazon" }] });
    const result = service.evaluateRule(rule, { eventName: "invoice.created" as const, payload: { issuer: "Amazon ES" } });
    expect(result.matched).toBe(true);
  });

  it("evaluates in operator", () => {
    const rule = makeRule({ conditions: [{ field: "type", operator: "in", value: ["EXPENSE", "RECURRING_CHARGE"] }] });
    const result = service.evaluateRule(rule, { eventName: "finance.entry.created" as const, payload: { type: "EXPENSE" } });
    expect(result.matched).toBe(true);
  });

  it("evaluates exists operator", () => {
    const rule = makeRule({ conditions: [{ field: "category", operator: "exists" }] });
    const result = service.evaluateRule(rule, { eventName: "finance.entry.created" as const, payload: { category: "utilities" } });
    expect(result.matched).toBe(true);
  });

  it("evaluates not_exists operator", () => {
    const rule = makeRule({ conditions: [{ field: "category", operator: "not_exists" }] });
    const result = service.evaluateRule(rule, { eventName: "finance.entry.created" as const, payload: {} });
    expect(result.matched).toBe(true);
  });

  it("evaluates nested field with dot notation", () => {
    const rule = makeRule({ conditions: [{ field: "actor.type", operator: "eq", value: "user" }] });
    const result = service.evaluateRule(rule, { eventName: "task.created" as const, payload: { actor: { type: "user" } } });
    expect(result.matched).toBe(true);
  });
});

// ─── processEvent ─────────────────────────────────────────────────────────────

describe("AutomationService.processEvent", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("records trigger when rule matches", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([
      makeRule({ conditions: [] }),
    ]);
    repositoryMock.recordTrigger.mockResolvedValue(undefined);
    await service.processEvent("finance.entry.created", { amount: 100 });
    expect(repositoryMock.recordTrigger).toHaveBeenCalledWith("rule-1");
  });

  it("creates approval when rule requires approval", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([
      makeRule({ conditions: [], requiresApproval: true }),
    ]);
    repositoryMock.recordTrigger.mockResolvedValue(undefined);
    repositoryMock.createApproval.mockResolvedValue(makeApproval());
    await service.processEvent("finance.entry.created", { amount: 100 });
    expect(repositoryMock.createApproval).toHaveBeenCalled();
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "automation.approval.requested",
      expect.objectContaining({ ruleId: "rule-1" }),
    );
  });

  it("does not trigger unmatched rules", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([
      makeRule({ conditions: [{ field: "amount", operator: "gt", value: 1000 }] }),
    ]);
    await service.processEvent("finance.entry.created", { amount: 50 });
    expect(repositoryMock.recordTrigger).not.toHaveBeenCalled();
  });
});

// ─── grantApproval / denyApproval ─────────────────────────────────────────────

describe("AutomationService.grantApproval", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("grants approval and executes rule", async () => {
    const rule = makeRule({ conditions: [] });
    const approval = makeApproval();
    repositoryMock.findApprovalWithRule.mockResolvedValue({ ...approval, automationRule: rule });
    repositoryMock.updateApprovalStatus.mockResolvedValue({ ...approval, status: "APPROVED" });
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([]);
    const result = await service.grantApproval("approval-1");
    expect(result?.status).toBe("APPROVED");
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "automation.approval.granted",
      expect.objectContaining({ approvalId: "approval-1" }),
    );
  });

  it("returns null when not found", async () => {
    repositoryMock.findApprovalWithRule.mockResolvedValue(null);
    const result = await service.grantApproval("missing");
    expect(result).toBeNull();
  });
});

describe("AutomationService.denyApproval", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("denies approval with reason", async () => {
    repositoryMock.findApprovalById.mockResolvedValue(makeApproval());
    repositoryMock.updateApprovalStatus.mockResolvedValue({ ...makeApproval(), status: "DENIED" });
    repositoryMock.findRuleById.mockResolvedValue(makeRule());
    const result = await service.denyApproval("approval-1", "Not needed");
    expect(result?.status).toBe("DENIED");
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "automation.approval.denied",
      expect.objectContaining({ approvalId: "approval-1" }),
    );
  });

  it("returns null when not found", async () => {
    repositoryMock.findApprovalById.mockResolvedValue(null);
    const result = await service.denyApproval("missing");
    expect(result).toBeNull();
  });
});
