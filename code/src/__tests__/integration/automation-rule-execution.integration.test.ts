import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventBus } from "@/lib/events";
import { AutomationService } from "@/modules/automations/automation.service";
import { notificationRouter, registerNotificationSubscriptions } from "@/modules/automations/notification-router";
import type { NotificationChannel, NotificationPayload } from "@/modules/automations/notification.types";
import type { AutomationRule } from "@/modules/automations/automation.types";
import type { AutomationRepository } from "@/modules/automations/automation.repository";

const { repositoryMock, taskServiceMock } = vi.hoisted(() => ({
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
  taskServiceMock: {
    createTask: vi.fn(),
  },
}));

vi.mock("@/modules/tasks/task.repository", () => ({
  TaskRepository: vi.fn(),
}));

vi.mock("@/modules/tasks/task.service", () => ({
  TaskService: vi.fn().mockImplementation(() => taskServiceMock),
}));

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: "rule-e2e-1",
    name: "Create follow-up task",
    description: null,
    triggerEvent: "finance.entry.created",
    conditions: [{ field: "amount", operator: "gt", value: 500 }] as never,
    actions: [{ type: "create_task", params: { title: "Review large expense" } }] as never,
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

describe("Integration: domain event → automations → side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();

    const service = new AutomationService(repositoryMock as unknown as AutomationRepository);
    eventBus.on("finance.entry.created", async (payload) => {
      await service.processEvent("finance.entry.created", payload as unknown as Record<string, unknown>);
    });

    registerNotificationSubscriptions();
    repositoryMock.recordTrigger.mockResolvedValue(undefined);
    repositoryMock.createApproval.mockResolvedValue({
      id: "approval-e2e-1",
      automationRuleId: "rule-e2e-1",
      triggerEventPayload: { amount: 900 },
      proposedActions: [{ type: "create_task", params: { title: "Review large expense" } }],
      status: "PENDING",
      expiresAt: new Date(Date.now() + 86400000),
      decidedAt: null,
      decidedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("creates a task when a matching domain event triggers a rule", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([makeRule()]);
    taskServiceMock.createTask.mockResolvedValue({ id: "task-e2e-1" });

    const executedEvents: Array<{ result: string; ruleId: string }> = [];
    eventBus.on("automation.action.executed", (payload) => {
      executedEvents.push({ result: payload.result, ruleId: payload.ruleId });
    });

    await eventBus.emit("finance.entry.created", {
      entryId: "entry-e2e-1",
      type: "EXPENSE",
      amount: 900,
      currency: "EUR",
      timestamp: new Date(),
      actor: { type: "system" },
    });

    expect(repositoryMock.recordTrigger).toHaveBeenCalledWith("rule-e2e-1");
    expect(taskServiceMock.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Review large expense" }),
    );
    expect(executedEvents).toContainEqual({ result: "success", ruleId: "rule-e2e-1" });
  });

  it("requests approval and emits notification when rule requires approval", async () => {
    repositoryMock.findEnabledRulesForEvent.mockResolvedValue([
      makeRule({
        name: "Approve large expense task",
        requiresApproval: true,
      }),
    ]);

    const received: NotificationPayload[] = [];
    const channel: NotificationChannel = {
      id: "capture-e2e",
      name: "Capture E2E",
      send: async (payload) => {
        received.push(payload);
        return { channelId: "capture-e2e", success: true };
      },
    };

    notificationRouter.register(channel);

    await eventBus.emit("finance.entry.created", {
      entryId: "entry-e2e-2",
      type: "EXPENSE",
      amount: 900,
      currency: "EUR",
      timestamp: new Date(),
      actor: { type: "system" },
    });

    expect(repositoryMock.createApproval).toHaveBeenCalledOnce();
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);
    expect(received[0].subject).toContain("Approval required: Approve large expense task");

    notificationRouter.unregister("capture-e2e");
  });
});
