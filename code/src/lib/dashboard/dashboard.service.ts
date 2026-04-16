import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { TaskRepository } from "@/modules/tasks/task.repository";
import type { DashboardStats, DashboardLayout } from "./dashboard.types";

const inboxRepo = new InboxRepository();
const taskRepo = new TaskRepository();

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [inboxResult, tasksResult, tasksDueResult] = await Promise.all([
    inboxRepo.findAll({ status: "PENDING", pageSize: 1 }),
    taskRepo.findAll({ status: "PENDING", pageSize: 1 }),
    taskRepo.findAll({
      status: "PENDING",
      dueAfter: today,
      dueBefore: tomorrow,
      pageSize: 1,
    }),
  ]);

  return {
    inboxPending: inboxResult.total,
    tasksPending: tasksResult.total,
    tasksDueToday: tasksDueResult.total,
    documentsRecent: 0,
    invoicesUnpaid: 0,
    homeAlerts: 0,
  };
}

export function buildDashboardLayout(stats: DashboardStats): DashboardLayout {
  const primary = [
    {
      id: "inbox",
      label: "Inbox",
      count: stats.inboxPending,
      icon: "📬",
      href: "/inbox/dashboard",
      color: "var(--color-olive)",
    },
    {
      id: "tasks",
      label: "Tareas",
      count: stats.tasksPending,
      icon: "✓",
      href: "/tasks/dashboard",
      color: "var(--color-moss)",
    },
    {
      id: "tasks-due",
      label: "Hoy",
      count: stats.tasksDueToday,
      icon: "📅",
      href: "/tasks/dashboard?status=PENDING&dueBefore=today",
      color: "var(--color-cream)",
    },
    {
      id: "documents",
      label: "Documentos",
      count: stats.documentsRecent,
      icon: "📄",
      href: "/documents/dashboard",
    },
  ];

  const secondary = [
    {
      id: "invoices",
      label: "Facturas",
      count: stats.invoicesUnpaid,
      icon: "💳",
      href: "/invoices/dashboard",
    },
    {
      id: "home",
      label: "Casa",
      count: stats.homeAlerts,
      icon: "🏠",
      href: "/home/dashboard",
    },
    {
      id: "ideas",
      label: "Ideas",
      count: 0,
      icon: "💡",
      href: "/ideas/dashboard",
    },
    {
      id: "audit",
      label: "Auditoría",
      count: 0,
      icon: "📊",
      href: "/audit/dashboard",
    },
  ];

  return { primary, secondary };
}
