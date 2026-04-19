import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { TaskRepository } from "@/modules/tasks/task.repository";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { HomeRepository } from "@/modules/home/home.repository";
import { IdeasRepository } from "@/modules/ideas/ideas.repository";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { FinanceRepository } from "@/modules/finance/finance.repository";
import type { DashboardStats, DashboardLayout } from "./dashboard.types";

const inboxRepo = new InboxRepository();
const taskRepo = new TaskRepository();
const documentRepo = new DocumentRepository();
const invoiceRepo = new InvoiceRepository();
const homeRepo = new HomeRepository();
const ideasRepo = new IdeasRepository();
const automationRepo = new AutomationRepository();
const financeRepo = new FinanceRepository();

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    inboxResult,
    tasksResult,
    tasksDueResult,
    documentsCount,
    invoicesCount,
    homeAlertsCount,
    ideasCount,
    approvalsCount,
    anomaliesCount,
  ] = await Promise.all([
    inboxRepo.findAll({ status: "PENDING", pageSize: 1 }),
    taskRepo.findAll({ status: "PENDING", pageSize: 1 }),
    taskRepo.findAll({
      status: "PENDING",
      dueAfter: today,
      dueBefore: tomorrow,
      pageSize: 1,
    }),
    documentRepo.count(),
    invoiceRepo.count({ status: "PENDING" }),
    homeRepo.count({ severity: "WARNING" }),
    ideasRepo.count({ status: "CAPTURED" }),
    automationRepo.countApprovals({ status: "PENDING" }),
    financeRepo.count({ isAnomaly: true }),
  ]);

  return {
    inboxPending: inboxResult.total,
    tasksPending: tasksResult.total,
    tasksDueToday: tasksDueResult.total,
    documentsTotal: documentsCount,
    invoicesUnpaid: invoicesCount,
    homeAlerts: homeAlertsCount,
    ideasCaptured: ideasCount,
    approvalsPending: approvalsCount,
    financeAnomalies: anomaliesCount,
  };
}

export function buildDashboardLayout(stats: DashboardStats): DashboardLayout {
  const primary = [
    {
      id: "inbox",
      label: "Inbox",
      count: stats.inboxPending,
      icon: "inbox",
      href: "/inbox/dashboard",
      color: "var(--color-olive)",
    },
    {
      id: "tasks",
      label: "Tareas pendientes",
      count: stats.tasksPending,
      icon: "check_circle",
      href: "/tasks/dashboard",
      color: "var(--color-moss)",
    },
    {
      id: "tasks-due",
      label: "Vencen hoy",
      count: stats.tasksDueToday,
      icon: "today",
      href: "/tasks/dashboard",
      color: "var(--color-cream)",
    },
    {
      id: "invoices",
      label: "Facturas sin pagar",
      count: stats.invoicesUnpaid,
      icon: "receipt_long",
      href: "/invoices/dashboard",
      color: "var(--color-olive)",
    },
  ];

  const secondary = [
    {
      id: "ideas",
      label: "Ideas capturadas",
      count: stats.ideasCaptured,
      icon: "lightbulb",
      href: "/ideas/dashboard",
    },
    {
      id: "documents",
      label: "Documentos",
      count: stats.documentsTotal,
      icon: "description",
      href: "/documents/dashboard",
    },
    {
      id: "approvals",
      label: "Aprobaciones",
      count: stats.approvalsPending,
      icon: "approval",
      href: "/automations/dashboard",
    },
    {
      id: "finance-anomalies",
      label: "Anomalías financieras",
      count: stats.financeAnomalies,
      icon: "warning",
      href: "/finance/dashboard",
    },
    {
      id: "home",
      label: "Alertas del hogar",
      count: stats.homeAlerts,
      icon: "home",
      href: "/home/dashboard",
    },
    {
      id: "audit",
      label: "Auditoría",
      count: 0,
      icon: "bar_chart",
      href: "/audit/dashboard",
    },
  ];

  return { primary, secondary };
}
