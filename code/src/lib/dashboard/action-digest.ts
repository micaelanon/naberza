import { ROUTE_PATHS } from "@/lib/constants";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { HomeRepository } from "@/modules/home/home.repository";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { TaskRepository } from "@/modules/tasks/task.repository";

export interface ActionDigestItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone?: "default" | "warning" | "urgent";
}

export interface ActionDigest {
  focus: ActionDigestItem[];
  needsAction: ActionDigestItem[];
  usefulSignals: ActionDigestItem[];
}

const inboxRepo = new InboxRepository();
const taskRepo = new TaskRepository();
const invoiceRepo = new InvoiceRepository();
const homeRepo = new HomeRepository();
const automationRepo = new AutomationRepository();
const documentRepo = new DocumentRepository();

function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "sin fecha";
  return new Date(date).toLocaleDateString("es-ES");
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function buildOverdueInvoiceItem(overdueInvoices: Awaited<ReturnType<InvoiceRepository["findOverdue"]>>): ActionDigestItem | null {
  if (overdueInvoices.length === 0) return null;
  const first = overdueInvoices[0];
  return {
    id: `invoice-overdue-${first.id}`,
    title: `${overdueInvoices.length} ${pluralize(overdueInvoices.length, "factura vencida", "facturas vencidas")}`,
    detail: `${first.issuer} · ${formatCurrency(first.amount.toString())} · venció el ${formatDate(first.dueDate)}`,
    href: ROUTE_PATHS.INVOICES,
    tone: "urgent",
  };
}

function buildDueTodayTaskItem(tasksDueToday: Awaited<ReturnType<TaskRepository["findAll"]>>): ActionDigestItem | null {
  if (tasksDueToday.total === 0 || !tasksDueToday.items[0]) return null;
  return {
    id: `task-due-${tasksDueToday.items[0].id}`,
    title: `${tasksDueToday.total} ${pluralize(tasksDueToday.total, "tarea vence hoy", "tareas vencen hoy")}`,
    detail: tasksDueToday.items[0].title,
    href: ROUTE_PATHS.TASKS,
    tone: "urgent",
  };
}

function buildHomeWarningItem(homeWarnings: Awaited<ReturnType<HomeRepository["list"]>>): ActionDigestItem | null {
  if (homeWarnings.length === 0) return null;
  const first = homeWarnings[0];
  return {
    id: `home-warning-${first.id}`,
    title: `${homeWarnings.length} ${pluralize(homeWarnings.length, "alerta del hogar", "alertas del hogar")}`,
    detail: `${first.entityId} · ${first.state}`,
    href: ROUTE_PATHS.HOME,
    tone: "warning",
  };
}

function buildApprovalItem(pendingApprovals: Awaited<ReturnType<AutomationRepository["listApprovals"]>>): ActionDigestItem | null {
  if (pendingApprovals.length === 0) return null;
  const first = pendingApprovals[0];
  return {
    id: `approval-${first.id}`,
    title: `${pendingApprovals.length} ${pluralize(pendingApprovals.length, "aprobación pendiente", "aprobaciones pendientes")}`,
    detail: `Creada el ${formatDate(first.createdAt)}`,
    href: ROUTE_PATHS.AUTOMATIONS,
    tone: "warning",
  };
}

function buildInboxItem(pendingInbox: Awaited<ReturnType<InboxRepository["findAll"]>>): ActionDigestItem | null {
  if (pendingInbox.total === 0 || !pendingInbox.items[0]) return null;
  return {
    id: `inbox-${pendingInbox.items[0].id}`,
    title: `${pendingInbox.total} ${pluralize(pendingInbox.total, "item sin clasificar", "items sin clasificar")}`,
    detail: pendingInbox.items[0].title,
    href: ROUTE_PATHS.INBOX,
  };
}

function buildPendingTaskItem(pendingTasks: Awaited<ReturnType<TaskRepository["findAll"]>>): ActionDigestItem | null {
  if (pendingTasks.total === 0 || !pendingTasks.items[0]) return null;
  const first = pendingTasks.items[0];
  const detail = first.dueAt ? `${first.title} · vence ${formatDate(first.dueAt)}` : first.title;
  return {
    id: `task-pending-${first.id}`,
    title: `${pendingTasks.total} ${pluralize(pendingTasks.total, "tarea pendiente", "tareas pendientes")}`,
    detail,
    href: ROUTE_PATHS.TASKS,
  };
}

function buildPendingInvoiceItem(
  pendingInvoices: Awaited<ReturnType<InvoiceRepository["list"]>>,
  inSevenDays: Date,
): ActionDigestItem | null {
  if (pendingInvoices.length === 0) return null;
  const upcoming = pendingInvoices.find((invoice) => invoice.dueDate && new Date(invoice.dueDate) <= inSevenDays) ?? pendingInvoices[0];
  const dueText = upcoming.dueDate ? ` · vence ${formatDate(upcoming.dueDate)}` : "";
  return {
    id: `invoice-pending-${upcoming.id}`,
    title: `${pendingInvoices.length} ${pluralize(pendingInvoices.length, "factura sin pagar", "facturas sin pagar")}`,
    detail: `${upcoming.issuer} · ${formatCurrency(upcoming.amount.toString())}${dueText}`,
    href: ROUTE_PATHS.INVOICES,
  };
}

function buildUsefulSignals(documentsCount: number, isQuietDay: boolean): ActionDigestItem[] {
  const signals: ActionDigestItem[] = [
    {
      id: "documents-total",
      title: `${documentsCount} documentos archivados`,
      detail: "Paperless ya está aportando contexto documental al sistema.",
      href: ROUTE_PATHS.DOCUMENTS,
    },
  ];

  if (isQuietDay) {
    signals.push({
      id: "quiet-day",
      title: "Día tranquilo",
      detail: "No hay nada urgente detectado ahora mismo.",
      href: ROUTE_PATHS.HOME,
    });
  }

  return signals;
}

export async function getActionDigest(): Promise<ActionDigest> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [
    overdueInvoices,
    pendingInvoices,
    dueTodayTasks,
    pendingTasks,
    pendingInbox,
    pendingApprovals,
    homeWarnings,
    documentsCount,
  ] = await Promise.all([
    invoiceRepo.findOverdue(),
    invoiceRepo.list({ status: "PENDING", limit: 5 }),
    taskRepo.findAll({ status: "PENDING", dueAfter: today, dueBefore: tomorrow, pageSize: 5 }),
    taskRepo.findAll({ status: "PENDING", pageSize: 5 }),
    inboxRepo.findAll({ status: "PENDING", pageSize: 5 }),
    automationRepo.listApprovals({ status: "PENDING", limit: 5 }),
    homeRepo.list({ severity: "WARNING", acknowledged: false, limit: 5 }),
    documentRepo.count(),
  ]);

  const focus = [
    buildOverdueInvoiceItem(overdueInvoices),
    buildDueTodayTaskItem(dueTodayTasks),
    buildHomeWarningItem(homeWarnings),
    buildApprovalItem(pendingApprovals),
  ].filter(Boolean) as ActionDigestItem[];

  const needsAction = [
    buildInboxItem(pendingInbox),
    buildPendingTaskItem(pendingTasks),
    buildPendingInvoiceItem(pendingInvoices, inSevenDays),
  ].filter(Boolean) as ActionDigestItem[];

  const isQuietDay = pendingInbox.total === 0
    && pendingApprovals.length === 0
    && overdueInvoices.length === 0
    && dueTodayTasks.total === 0;

  const usefulSignals = buildUsefulSignals(documentsCount, isQuietDay);

  return { focus, needsAction, usefulSignals };
}
