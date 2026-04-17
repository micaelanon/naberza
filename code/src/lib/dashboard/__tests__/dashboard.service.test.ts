import { describe, expect, it, vi } from "vitest";

const { inboxRepoMock, taskRepoMock, documentRepoMock, invoiceRepoMock, homeRepoMock } = vi.hoisted(() => ({
  inboxRepoMock: { findAll: vi.fn() },
  taskRepoMock: { findAll: vi.fn() },
  documentRepoMock: { count: vi.fn() },
  invoiceRepoMock: { count: vi.fn() },
  homeRepoMock: { count: vi.fn() },
}));

vi.mock("@/modules/inbox/inbox.repository", () => ({
  InboxRepository: vi.fn().mockImplementation(() => inboxRepoMock),
}));

vi.mock("@/modules/tasks/task.repository", () => ({
  TaskRepository: vi.fn().mockImplementation(() => taskRepoMock),
}));

vi.mock("@/modules/documents/document.repository", () => ({
  DocumentRepository: vi.fn().mockImplementation(() => documentRepoMock),
}));

vi.mock("@/modules/invoices/invoice.repository", () => ({
  InvoiceRepository: vi.fn().mockImplementation(() => invoiceRepoMock),
}));

vi.mock("@/modules/home/home.repository", () => ({
  HomeRepository: vi.fn().mockImplementation(() => homeRepoMock),
}));

import { getDashboardStats, buildDashboardLayout } from "../dashboard.service";

describe("DashboardService", () => {
  describe("getDashboardStats", () => {
    it("returns real counts from all repositories", async () => {
      inboxRepoMock.findAll.mockResolvedValue({ total: 5 });
      taskRepoMock.findAll
        .mockResolvedValueOnce({ total: 12 }) // tasksPending
        .mockResolvedValueOnce({ total: 3 }); // tasksDueToday
      documentRepoMock.count.mockResolvedValue(8);
      invoiceRepoMock.count.mockResolvedValue(2);
      homeRepoMock.count.mockResolvedValue(1);

      const stats = await getDashboardStats();

      expect(stats).toMatchObject({
        inboxPending: 5,
        tasksPending: 12,
        tasksDueToday: 3,
        documentsRecent: 8,
        invoicesUnpaid: 2,
        homeAlerts: 1,
      });
    });

    it("returns zeros when all repos return empty", async () => {
      inboxRepoMock.findAll.mockResolvedValue({ total: 0 });
      taskRepoMock.findAll.mockResolvedValue({ total: 0 });
      documentRepoMock.count.mockResolvedValue(0);
      invoiceRepoMock.count.mockResolvedValue(0);
      homeRepoMock.count.mockResolvedValue(0);

      const stats = await getDashboardStats();

      expect(stats.documentsRecent).toBe(0);
      expect(stats.invoicesUnpaid).toBe(0);
      expect(stats.homeAlerts).toBe(0);
    });

    it("calls invoiceRepo.count with PENDING status", async () => {
      inboxRepoMock.findAll.mockResolvedValue({ total: 0 });
      taskRepoMock.findAll.mockResolvedValue({ total: 0 });
      documentRepoMock.count.mockResolvedValue(0);
      invoiceRepoMock.count.mockResolvedValue(3);
      homeRepoMock.count.mockResolvedValue(0);

      await getDashboardStats();

      expect(invoiceRepoMock.count).toHaveBeenCalledWith({ status: "PENDING" });
    });

    it("calls homeRepo.count with WARNING severity", async () => {
      inboxRepoMock.findAll.mockResolvedValue({ total: 0 });
      taskRepoMock.findAll.mockResolvedValue({ total: 0 });
      documentRepoMock.count.mockResolvedValue(0);
      invoiceRepoMock.count.mockResolvedValue(0);
      homeRepoMock.count.mockResolvedValue(4);

      await getDashboardStats();

      expect(homeRepoMock.count).toHaveBeenCalledWith({ severity: "WARNING" });
    });
  });

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

    it("documents tile reflects documentsRecent count", () => {
      const stats = {
        inboxPending: 0,
        tasksPending: 0,
        tasksDueToday: 0,
        documentsRecent: 5,
        invoicesUnpaid: 0,
        homeAlerts: 0,
      };

      const layout = buildDashboardLayout(stats);

      const docTile = layout.primary.find((t) => t.id === "documents");
      expect(docTile?.count).toBe(5);
    });

    it("invoices tile reflects invoicesUnpaid count", () => {
      const stats = {
        inboxPending: 0,
        tasksPending: 0,
        tasksDueToday: 0,
        documentsRecent: 0,
        invoicesUnpaid: 3,
        homeAlerts: 0,
      };

      const layout = buildDashboardLayout(stats);

      const invoiceTile = layout.secondary.find((t) => t.id === "invoices");
      expect(invoiceTile?.count).toBe(3);
    });

    it("home tile reflects homeAlerts count", () => {
      const stats = {
        inboxPending: 0,
        tasksPending: 0,
        tasksDueToday: 0,
        documentsRecent: 0,
        invoicesUnpaid: 0,
        homeAlerts: 2,
      };

      const layout = buildDashboardLayout(stats);

      const homeTile = layout.secondary.find((t) => t.id === "home");
      expect(homeTile?.count).toBe(2);
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
