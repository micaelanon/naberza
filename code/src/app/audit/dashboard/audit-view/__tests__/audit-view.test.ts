import { describe, expect, it } from "vitest";

describe("AuditView", () => {
  it("renders audit entries with status labels", () => {
    const statusLabels: Record<string, string> = {
      success: "✓ Éxito",
      failure: "✗ Error",
      pending: "⧗ Pendiente",
    };

    expect(statusLabels.success).toBe("✓ Éxito");
    expect(statusLabels.failure).toBe("✗ Error");
    expect(statusLabels.pending).toBe("⧗ Pendiente");
  });

  it("maps actor icons correctly", () => {
    const actorIcons: Record<string, string> = {
      user: "👤",
      system: "⚙️",
      automation: "🤖",
      integration: "🔗",
    };

    expect(actorIcons.user).toBe("👤");
    expect(actorIcons.system).toBe("⚙️");
    expect(actorIcons.automation).toBe("🤖");
    expect(actorIcons.integration).toBe("🔗");
  });
});
