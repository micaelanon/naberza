import { describe, expect, it, vi } from "vitest";

const {
  inboxRepoMock,
  taskRepoMock,
  documentRepoMock,
  invoiceRepoMock,
  homeRepoMock,
  ideasRepoMock,
  automationRepoMock,
  financeRepoMock,
} = vi.hoisted(() => ({
  inboxRepoMock: { findAll: vi.fn() },
  taskRepoMock: { findAll: vi.fn() },
  documentRepoMock: { count: vi.fn() },
  invoiceRepoMock: { count: vi.fn() },
  homeRepoMock: { count: vi.fn() },
  ideasRepoMock: { count: vi.fn() },
  automationRepoMock: { countApprovals: vi.fn() },
  financeRepoMock: { count: vi.fn() },
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

vi.mock("@/modules/ideas/ideas.repository", () => ({
  IdeasRepository: vi.fn().mockImplementation(() => ideasRepoMock),
}));

vi.mock("@/modules/automations/automation.repository", () => ({
  AutomationRepository: vi.fn().mockImplementation(() => automationRepoMock),
}));

vi.mock("@/modules/finance/finance.repository", () => ({
  FinanceRepository: vi.fn().mockImplementation(() => financeRepoMock),
}));

import { getDashboardStats, buildDashboardLayout } from "../dashboard.service";

function defaultMocks(overrides: Record<string, unknown> = {}) {
  inboxRepoMock.findAll.mockResolvedValue({ total: 0 });
  taskRepoMock.findAll.mockResolvedValue({ total: 0 });
  documentRepoMock.count.mockResolvedValue(0);
  invoiceRepoMock.count.mockResolvedValue(0);
  homeRepoMock.count.mockResolvedValue(0);
  ideasRepoMock.count.mockResolvedValue(0);
  automationRepoMock.countApprovals.mockResolvedValue(0);
  financeRepoMock.count.mockResolvedValue(0);
  Object.assign({}, overrides);
}

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
      ideasRepoMock.count.mockResolvedValue(4);
      automationRepoMock.countApprovals.mockResolvedValue(1);
      financeRepoMock.count.mockResolvedValue(0);

      const stats = await getDashboardStats();

      expect(stats).toMatchObject({
        inboxPending: 5,
        tasksPending: 12,
        tasksDueToday: 3,
        documentsTotal: 8,
        invoicesUnpaid: 2,
        homeAlerts: 1,
        ideasCaptured: 4,
        approvalsPending: 1,
        financeAnomalies: 0,
      });
    });

    it("returns zeros when all repos return empty", async () => {
      defaultMocks();

      const stats = await getDashboardStats();

      expect(stats.documentsTotal).toBe(0);
      expect(stats.invoicesUnpaid).toBe(0);
      expect(stats.homeAlerts).toBe(0);
      expect(stats.ideasCaptured).toBe(0);
      expect(stats.approvalsPending).toBe(0);
      expect(stats.financeAnomalies).toBe(0);
    });

    it("calls invoiceRepo.count with PENDING status", async () => {
      defaultMocks();
      invoiceRepoMock.count.mockResolvedValue(3);

      await getDashboardStats();

      expect(invoiceRepoMock.count).toHaveBeenCalledWith({ status: "PENDING" });
    });

    it("calls homeRepo.count with WARNING severity", async () => {
      defaultMocks();
      homeRepoMock.count.mockResolvedValue(4);

      await getDashboardStats();

      expect(homeRepoMock.count).toHaveBeenCalledWith({ severity: "WARNING" });
    });

    it("calls ideasRepo.count with CAPTURED status", async () => {
      defaultMocks();
      ideasRepoMock.count.mockResolvedValue(7);

      await getDashboardStats();

      expect(ideasRepoMock.count).toHaveBeenCalledWith({ status: "CAPTURED" });
    });

    it("calls automationRepo.countApprovals with PENDING status", async () => {
      defaultMocks();
      automationRepoMock.countApprovals.mockResolvedValue(2);

      await getDashboardStats();

      expect(automationRepoMock.countApprovals).toHaveBeenCalledWith({ status: "PENDING" });
    });

    it("calls financeRepo.count with isAnomaly flag", async () => {
      defaultMocks();
      financeRepoMock.count.mockResolvedValue(3);

      await getDashboardStats();

      expect(financeRepoMock.count).toHaveBeenCalledWith({ isAnomaly: true });
    });
  });

  describe("buildDashboardLayout", () => {
    const baseStats = {
      inboxPending: 0,
      tasksPending: 0,
      tasksDueToday: 0,
      documentsTotal: 0,
      invoicesUnpaid: 0,
      homeAlerts: 0,
      ideasCaptured: 0,
      approvalsPending: 0,
      financeAnomalies: 0,
    };

    it("builds dashboard tiles from stats", () => {
      const stats = { ...baseStats, inboxPending: 3, tasksPending: 7, tasksDueToday: 2, invoicesUnpaid: 1 };

      const layout = buildDashboardLayout(stats);

      expect(layout.primary).toHaveLength(4);
      expect(layout.secondary.length).toBeGreaterThanOrEqual(4);

      const inboxTile = layout.primary.find((t) => t.id === "inbox");
      expect(inboxTile?.count).toBe(3);
      expect(inboxTile?.href).toBe("/inbox/dashboard");

      const taskTile = layout.primary.find((t) => t.id === "tasks");
      expect(taskTile?.count).toBe(7);

      const invoiceTile = layout.primary.find((t) => t.id === "invoices");
      expect(invoiceTile?.count).toBe(1);
    });

    it("documents tile reflects documentsTotal count", () => {
      const stats = { ...baseStats, documentsTotal: 5 };

      const layout = buildDashboardLayout(stats);

      const docTile = layout.secondary.find((t) => t.id === "documents");
      expect(docTile?.count).toBe(5);
    });

    it("ideas tile reflects ideasCaptured count", () => {
      const stats = { ...baseStats, ideasCaptured: 9 };

      const layout = buildDashboardLayout(stats);

      const ideasTile = layout.secondary.find((t) => t.id === "ideas");
      expect(ideasTile?.count).toBe(9);
    });

    it("approvals tile reflects approvalsPending count", () => {
      const stats = { ...baseStats, approvalsPending: 3 };

      const layout = buildDashboardLayout(stats);

      const approvalTile = layout.secondary.find((t) => t.id === "approvals");
      expect(approvalTile?.count).toBe(3);
    });

    it("home tile reflects homeAlerts count", () => {
      const stats = { ...baseStats, homeAlerts: 2 };

      const layout = buildDashboardLayout(stats);

      const homeTile = layout.secondary.find((t) => t.id === "home");
      expect(homeTile?.count).toBe(2);
    });

    it("includes secondary tiles for all expected modules", () => {
      const layout = buildDashboardLayout(baseStats);

      const tileIds = layout.secondary.map((t) => t.id);
      expect(tileIds).toContain("ideas");
      expect(tileIds).toContain("documents");
      expect(tileIds).toContain("home");
      expect(tileIds).toContain("audit");
    });
  });
});
