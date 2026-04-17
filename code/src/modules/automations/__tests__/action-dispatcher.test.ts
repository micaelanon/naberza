import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Service mocks ────────────────────────────────────────────────────────────

const { taskServiceMock, inboxServiceMock, invoiceServiceMock, financeServiceMock, ideasServiceMock } = vi.hoisted(() => ({
  taskServiceMock: { createTask: vi.fn() },
  inboxServiceMock: { createItem: vi.fn() },
  invoiceServiceMock: { markPaid: vi.fn() },
  financeServiceMock: { flagAnomaly: vi.fn() },
  ideasServiceMock: { archiveIdea: vi.fn() },
}));

vi.mock("@/modules/tasks/task.repository", () => ({
  TaskRepository: vi.fn(),
}));
vi.mock("@/modules/tasks/task.service", () => ({
  TaskService: vi.fn().mockImplementation(() => taskServiceMock),
}));
vi.mock("@/modules/inbox/inbox.repository", () => ({
  InboxRepository: vi.fn(),
}));
vi.mock("@/modules/inbox/inbox.service", () => ({
  InboxService: vi.fn().mockImplementation(() => inboxServiceMock),
}));
vi.mock("@/modules/invoices/invoice.repository", () => ({
  InvoiceRepository: vi.fn(),
}));
vi.mock("@/modules/invoices/invoice.service", () => ({
  InvoiceService: vi.fn().mockImplementation(() => invoiceServiceMock),
}));
vi.mock("@/modules/finance/finance.repository", () => ({
  FinanceRepository: vi.fn(),
}));
vi.mock("@/modules/finance/finance.service", () => ({
  FinanceService: vi.fn().mockImplementation(() => financeServiceMock),
}));
vi.mock("@/modules/ideas/ideas.repository", () => ({
  IdeasRepository: vi.fn(),
}));
vi.mock("@/modules/ideas/ideas.service", () => ({
  IdeasService: vi.fn().mockImplementation(() => ideasServiceMock),
}));

import { dispatchAction } from "../action-dispatcher";
import type { RuleAction } from "../automation.types";

const basePayload = { eventName: "test.event" };

// ─── create_task ──────────────────────────────────────────────────────────────

describe("dispatchAction — create_task", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls TaskService.createTask with params", async () => {
    taskServiceMock.createTask.mockResolvedValue({ id: "task-1" });
    const action: RuleAction = { type: "create_task", params: { title: "Review expense" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(taskServiceMock.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Review expense" }),
    );
  });

  it("returns failure when service throws", async () => {
    taskServiceMock.createTask.mockRejectedValue(new Error("DB error"));
    const action: RuleAction = { type: "create_task", params: { title: "Fail" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("DB error");
  });
});

// ─── create_inbox_item ────────────────────────────────────────────────────────

describe("dispatchAction — create_inbox_item", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls InboxService.createItem", async () => {
    inboxServiceMock.createItem.mockResolvedValue({ id: "item-1" });
    const action: RuleAction = { type: "create_inbox_item", params: { title: "Alert" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(inboxServiceMock.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Alert" }),
    );
  });
});

// ─── mark_invoice_paid ────────────────────────────────────────────────────────

describe("dispatchAction — mark_invoice_paid", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls InvoiceService.markPaid with invoiceId", async () => {
    invoiceServiceMock.markPaid.mockResolvedValue({ id: "inv-1", status: "PAID" });
    const action: RuleAction = { type: "mark_invoice_paid", params: { invoiceId: "inv-1" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(invoiceServiceMock.markPaid).toHaveBeenCalledWith("inv-1");
  });

  it("fails when invoiceId missing", async () => {
    const action: RuleAction = { type: "mark_invoice_paid", params: {} };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invoiceId");
  });

  it("fails when invoice not found", async () => {
    invoiceServiceMock.markPaid.mockResolvedValue(null);
    const action: RuleAction = { type: "mark_invoice_paid", params: { invoiceId: "missing" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});

// ─── flag_finance_anomaly ─────────────────────────────────────────────────────

describe("dispatchAction — flag_finance_anomaly", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses params.entryId", async () => {
    financeServiceMock.flagAnomaly.mockResolvedValue({ id: "e-1", isAnomaly: true });
    const action: RuleAction = { type: "flag_finance_anomaly", params: { entryId: "e-1", reason: "Duplicate" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(financeServiceMock.flagAnomaly).toHaveBeenCalledWith("e-1", "Duplicate");
  });

  it("falls back to eventPayload.entryId", async () => {
    financeServiceMock.flagAnomaly.mockResolvedValue({ id: "e-2", isAnomaly: true });
    const action: RuleAction = { type: "flag_finance_anomaly", params: { reason: "Auto" } };
    const result = await dispatchAction(action, { entryId: "e-2" });
    expect(result.success).toBe(true);
    expect(financeServiceMock.flagAnomaly).toHaveBeenCalledWith("e-2", "Auto");
  });

  it("fails when no entryId anywhere", async () => {
    const action: RuleAction = { type: "flag_finance_anomaly", params: {} };
    const result = await dispatchAction(action, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("entryId");
  });
});

// ─── archive_idea ─────────────────────────────────────────────────────────────

describe("dispatchAction — archive_idea", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls IdeasService.archiveIdea", async () => {
    ideasServiceMock.archiveIdea.mockResolvedValue({ id: "idea-1", status: "ARCHIVED" });
    const action: RuleAction = { type: "archive_idea", params: { ideaId: "idea-1" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(ideasServiceMock.archiveIdea).toHaveBeenCalledWith("idea-1");
  });
});

// ─── send_notification ────────────────────────────────────────────────────────

describe("dispatchAction — send_notification", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns not-implemented stub", async () => {
    const action: RuleAction = { type: "send_notification", params: { message: "Hello" } };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(true);
    expect(result.output).toMatchObject({ sent: false });
  });
});

// ─── webhook_call ─────────────────────────────────────────────────────────────

describe("dispatchAction — webhook_call", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls fetch with url and payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const action: RuleAction = { type: "webhook_call", params: { url: "https://hook.example.com/x" } };
    const result = await dispatchAction(action, { amount: 500 });
    expect(result.success).toBe(true);
    expect(result.output).toMatchObject({ status: 200, ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hook.example.com/x",
      expect.objectContaining({ method: "POST" }),
    );
    fetchSpy.mockRestore();
  });

  it("fails when url missing", async () => {
    const action: RuleAction = { type: "webhook_call", params: {} };
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("url");
  });
});

// ─── Unknown action type ──────────────────────────────────────────────────────

describe("dispatchAction — unknown type", () => {
  it("returns failure for unknown action", async () => {
    const action = { type: "nonexistent_action", params: {} } as unknown as RuleAction;
    const result = await dispatchAction(action, basePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown action type");
  });
});
