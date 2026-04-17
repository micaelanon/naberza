import { describe, it, expect, vi, beforeEach } from "vitest";

const { auditMock, automationMock } = vi.hoisted(() => ({
  auditMock: { registerAuditSubscriptions: vi.fn() },
  automationMock: { registerAutomationSubscriptions: vi.fn() },
}));

vi.mock("@/lib/audit", () => auditMock);
vi.mock("@/modules/automations/automation-subscriptions", () => automationMock);

// Import after mocks so the module-level `initialized` flag is reset each test
let bootstrap: () => void;

describe("bootstrap", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("../bootstrap");
    bootstrap = mod.bootstrap;
  });

  it("calls registerAuditSubscriptions on first call", () => {
    bootstrap();
    expect(auditMock.registerAuditSubscriptions).toHaveBeenCalledOnce();
  });

  it("calls registerAutomationSubscriptions on first call", () => {
    bootstrap();
    expect(automationMock.registerAutomationSubscriptions).toHaveBeenCalledOnce();
  });

  it("is idempotent — does not register twice on repeated calls", () => {
    bootstrap();
    bootstrap();
    expect(auditMock.registerAuditSubscriptions).toHaveBeenCalledOnce();
    expect(automationMock.registerAutomationSubscriptions).toHaveBeenCalledOnce();
  });
});
