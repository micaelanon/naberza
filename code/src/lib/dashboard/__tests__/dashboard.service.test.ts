import { describe, expect, it } from "vitest";

import { buildDashboardLayout } from "../dashboard.service";

describe("DashboardService", () => {
  describe("buildDashboardLayout", () => {
    it("builds dashboard tiles from stats", () => {
      const stats = {
        inboxPending: 3,
        tasksPending: 7,
        tasksDueToday: 2,
        documentsRecent: 1,
        invoicesUnpaid: 0,
        homeAlerts: 1,
      };

      const layout = buildDashboardLayout(stats);

      expect(layout.primary).toHaveLength(4);
      expect(layout.secondary).toHaveLength(4);

      const inboxTile = layout.primary.find((t) => t.id === "inbox");
      expect(inboxTile?.count).toBe(3);
      expect(inboxTile?.href).toBe("/inbox/dashboard");

      const taskTile = layout.primary.find((t) => t.id === "tasks");
      expect(taskTile?.count).toBe(7);
    });

    it("includes secondary tiles for all modules", () => {
      const stats = {
        inboxPending: 0,
        tasksPending: 0,
        tasksDueToday: 0,
        documentsRecent: 0,
        invoicesUnpaid: 0,
        homeAlerts: 0,
      };

      const layout = buildDashboardLayout(stats);

      const tileIds = layout.secondary.map((t) => t.id);
      expect(tileIds).toContain("invoices");
      expect(tileIds).toContain("home");
      expect(tileIds).toContain("ideas");
      expect(tileIds).toContain("audit");
    });
  });
});
