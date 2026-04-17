import { describe, it, expect, vi, beforeEach } from "vitest";

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    processEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/modules/automations/automation.repository", () => ({
  AutomationRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/automations/automation.service", () => ({
  AutomationService: vi.fn().mockImplementation(() => serviceMock),
}));

import { eventBus } from "@/lib/events";
import { registerAutomationSubscriptions } from "../automation-subscriptions";

describe("registerAutomationSubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    registerAutomationSubscriptions();
  });

  it("registers processEvent for inbox.item.created", async () => {
    await eventBus.emit("inbox.item.created", {
      itemId: "item-1",
      title: "Test",
      sourceType: "email",
      timestamp: new Date(),
      actor: { type: "system" },
    });
    expect(serviceMock.processEvent).toHaveBeenCalledWith(
      "inbox.item.created",
      expect.objectContaining({ itemId: "item-1" }),
    );
  });

  it("registers processEvent for finance.entry.created", async () => {
    await eventBus.emit("finance.entry.created", {
      entryId: "entry-1",
      type: "EXPENSE",
      amount: 500,
      currency: "EUR",
      timestamp: new Date(),
      actor: { type: "system" },
    });
    expect(serviceMock.processEvent).toHaveBeenCalledWith(
      "finance.entry.created",
      expect.objectContaining({ entryId: "entry-1" }),
    );
  });

  it("registers processEvent for invoice.created", async () => {
    await eventBus.emit("invoice.created", {
      invoiceId: "inv-1",
      issuer: "Acme",
      amount: 100,
      currency: "EUR",
      timestamp: new Date(),
      actor: { type: "system" },
    });
    expect(serviceMock.processEvent).toHaveBeenCalledWith(
      "invoice.created",
      expect.objectContaining({ invoiceId: "inv-1" }),
    );
  });

  it("registers processEvent for home.event.received", async () => {
    await eventBus.emit("home.event.received", {
      eventType: "state_changed",
      entityId: "light.kitchen",
      severity: "info",
      timestamp: new Date(),
      actor: { type: "system" },
    });
    expect(serviceMock.processEvent).toHaveBeenCalledWith(
      "home.event.received",
      expect.objectContaining({ entityId: "light.kitchen" }),
    );
  });

  it("does not throw when processEvent rejects", async () => {
    serviceMock.processEvent.mockRejectedValue(new Error("Rule engine error"));
    await expect(
      eventBus.emit("task.created", {
        taskId: "t-1",
        title: "Task",
        timestamp: new Date(),
        actor: { type: "system" },
      }),
    ).resolves.not.toThrow();
  });
});
