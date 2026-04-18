import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { TaskRepository } from "@/modules/tasks/task.repository";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { HomeRepository } from "@/modules/home/home.repository";
import type { DashboardStats, DashboardLayout } from "./dashboard.types";

const inboxRepo = new InboxRepository();
const taskRepo = new TaskRepository();
const documentRepo = new DocumentRepository();
const invoiceRepo = new InvoiceRepository();
const homeRepo = new HomeRepository();

const DOCUMENTS_RECENT_DAYS = 7;

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const recentDocsFrom = new Date(today);
  recentDocsFrom.setDate(recentDocsFrom.getDate() - DOCUMENTS_RECENT_DAYS);

  const [inboxResult, tasksResult, tasksDueResult, documentsCount, invoicesCount, homeAlertsCount] =
    await Promise.all([
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
    ]);

  return {
    inboxPending: inboxResult.total,
    tasksPending: tasksResult.total,
    tasksDueToday: tasksDueResult.total,
    documentsRecent: documentsCount,
    invoicesUnpaid: invoicesCount,
    homeAlerts: homeAlertsCount,
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
      label: "Tareas",
      count: stats.tasksPending,
      icon: "check_circle",
      href: "/tasks/dashboard",
      color: "var(--color-moss)",
    },
    {
      id: "tasks-due",
      label: "Hoy",
      count: stats.tasksDueToday,
      icon: "today",
      href: "/tasks/dashboard?status=PENDING&dueBefore=today",
      color: "var(--color-cream)",
    },
    {
      id: "documents",
      label: "Documentos",
      count: stats.documentsRecent,
      icon: "description",
      href: "/documents/dashboard",
    },
  ];

  const secondary = [
    {
      id: "invoices",
      label: "Facturas",
      count: stats.invoicesUnpaid,
      icon: "receipt_long",
      href: "/invoices/dashboard",
    },
    {
      id: "home",
      label: "Casa",
      count: stats.homeAlerts,
      icon: "home",
      href: "/home/dashboard",
    },
    {
      id: "ideas",
      label: "Ideas",
      count: 0,
      icon: "lightbulb",
      href: "/ideas/dashboard",
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
