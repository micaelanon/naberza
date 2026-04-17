import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    listRules: vi.fn(),
    getRule: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    listApprovals: vi.fn(),
    getApproval: vi.fn(),
    grantApproval: vi.fn(),
    denyApproval: vi.fn(),
  },
}));

vi.mock("@/modules/automations/automation.repository", () => ({
  AutomationRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/automations/automation.service", () => ({
  AutomationService: vi.fn().mockImplementation(() => serviceMock),
}));

import { GET as rulesGet, POST as rulesPost } from "../rules/route";
import { GET as ruleDetailGet, PATCH as rulePatch, DELETE as ruleDelete } from "../rules/[id]/route";
import { GET as approvalsGet } from "../approvals/route";
import { GET as approvalGet } from "../approvals/[id]/route";
import { POST as grantPost } from "../approvals/[id]/grant/route";
import { POST as denyPost } from "../approvals/[id]/deny/route";

function makeRuleSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    name: "Flag expense",
    description: null,
    triggerEvent: "finance.entry.created",
    conditionCount: 1,
    actionCount: 1,
    requiresApproval: false,
    enabled: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    ...overrides,
  };
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    name: "Flag expense",
    conditions: [],
    actions: [],
    triggerEvent: "finance.entry.created",
    requiresApproval: false,
    enabled: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "approval-1",
    automationRuleId: "rule-1",
    automationRuleName: "",
    status: "PENDING",
    proposedActions: [],
    expiresAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("GET /automations/api/rules", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with items and total", async () => {
    serviceMock.listRules.mockResolvedValue({ items: [makeRuleSummary()], total: 1 });
    const res = await rulesGet(new NextRequest("http://localhost/automations/api/rules"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("passes enabled filter", async () => {
    serviceMock.listRules.mockResolvedValue({ items: [], total: 0 });
    await rulesGet(new NextRequest("http://localhost/automations/api/rules?enabled=true"));
    expect(serviceMock.listRules).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("returns 500 on error", async () => {
    serviceMock.listRules.mockRejectedValue(new Error("DB down"));
    const res = await rulesGet(new NextRequest("http://localhost/automations/api/rules"));
    expect(res.status).toBe(500);
  });
});

describe("POST /automations/api/rules", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 201 with created rule", async () => {
    serviceMock.createRule.mockResolvedValue(makeRule());
    const req = new NextRequest("http://localhost/automations/api/rules", {
      method: "POST",
      body: JSON.stringify({ name: "Test", triggerEvent: "finance.entry.created", conditions: [], actions: [] }),
    });
    const res = await rulesPost(req);
    expect(res.status).toBe(201);
  });

  it("returns 400 when name missing", async () => {
    const req = new NextRequest("http://localhost/automations/api/rules", {
      method: "POST",
      body: JSON.stringify({ triggerEvent: "finance.entry.created", conditions: [], actions: [] }),
    });
    const res = await rulesPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when conditions not array", async () => {
    const req = new NextRequest("http://localhost/automations/api/rules", {
      method: "POST",
      body: JSON.stringify({ name: "x", triggerEvent: "finance.entry.created", conditions: "bad", actions: [] }),
    });
    const res = await rulesPost(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /automations/api/rules/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 when found", async () => {
    serviceMock.getRule.mockResolvedValue(makeRule());
    const res = await ruleDetailGet(new Request("http://localhost/automations/api/rules/rule-1"), {
      params: Promise.resolve({ id: "rule-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.getRule.mockResolvedValue(null);
    const res = await ruleDetailGet(new Request("http://localhost/automations/api/rules/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /automations/api/rules/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with updated rule", async () => {
    serviceMock.updateRule.mockResolvedValue(makeRule({ name: "Updated" }));
    const res = await rulePatch(
      new Request("http://localhost/automations/api/rules/rule-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "rule-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.updateRule.mockResolvedValue(null);
    const res = await rulePatch(
      new Request("http://localhost/automations/api/rules/missing", {
        method: "PATCH",
        body: JSON.stringify({ name: "x" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /automations/api/rules/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 when deleted", async () => {
    serviceMock.deleteRule.mockResolvedValue(true);
    const res = await ruleDelete(new Request("http://localhost/automations/api/rules/rule-1"), {
      params: Promise.resolve({ id: "rule-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.deleteRule.mockResolvedValue(false);
    const res = await ruleDelete(new Request("http://localhost/automations/api/rules/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /automations/api/approvals", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 with approvals", async () => {
    serviceMock.listApprovals.mockResolvedValue({ items: [makeApproval()], total: 1 });
    const res = await approvalsGet(new NextRequest("http://localhost/automations/api/approvals"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
  });
});

describe("GET /automations/api/approvals/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 when found", async () => {
    serviceMock.getApproval.mockResolvedValue(makeApproval());
    const res = await approvalGet(new Request("http://localhost/automations/api/approvals/approval-1"), {
      params: Promise.resolve({ id: "approval-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.getApproval.mockResolvedValue(null);
    const res = await approvalGet(new Request("http://localhost/automations/api/approvals/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /automations/api/approvals/[id]/grant", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 on grant", async () => {
    serviceMock.grantApproval.mockResolvedValue({ ...makeApproval(), status: "APPROVED" });
    const res = await grantPost(new Request("http://localhost/automations/api/approvals/approval-1/grant"), {
      params: Promise.resolve({ id: "approval-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.grantApproval.mockResolvedValue(null);
    const res = await grantPost(new Request("http://localhost/automations/api/approvals/missing/grant"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /automations/api/approvals/[id]/deny", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 200 on deny", async () => {
    serviceMock.denyApproval.mockResolvedValue({ ...makeApproval(), status: "DENIED" });
    const res = await denyPost(
      new Request("http://localhost/automations/api/approvals/approval-1/deny", {
        method: "POST",
        body: JSON.stringify({ reason: "Not needed" }),
      }),
      { params: Promise.resolve({ id: "approval-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    serviceMock.denyApproval.mockResolvedValue(null);
    const res = await denyPost(
      new Request("http://localhost/automations/api/approvals/missing/deny", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });
});
