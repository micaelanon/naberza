/**
 * Service factory — centralized instantiation of service + repository pairs.
 * Eliminates boilerplate duplication across route handlers.
 * All services are singletons (instantiated once at module load, reused across requests).
 */

import { InboxService } from "@/modules/inbox/inbox.service";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { TaskService } from "@/modules/tasks/task.service";
import { TaskRepository } from "@/modules/tasks/task.repository";
import { DocumentService } from "@/modules/documents/document.service";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { InvoiceService } from "@/modules/invoices/invoice.service";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { FinanceService } from "@/modules/finance/finance.service";
import { FinanceRepository } from "@/modules/finance/finance.repository";
import { HomeService } from "@/modules/home/home.service";
import { HomeRepository } from "@/modules/home/home.repository";
import { IdeasService } from "@/modules/ideas/ideas.service";
import { IdeasRepository } from "@/modules/ideas/ideas.repository";
import { AutomationService } from "@/modules/automations/automation.service";
import { AutomationRepository } from "@/modules/automations/automation.repository";
import { TelegramService } from "@/modules/telegram/telegram.service";
import { TelegramRepository } from "@/modules/telegram/telegram.repository";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";

// ─── Singleton instances ──────────────────────────────────────────────────────

const inboxRepository = new InboxRepository();
export const inboxService = new InboxService(inboxRepository);

const taskRepository = new TaskRepository();
export const taskService = new TaskService(taskRepository);

const documentRepository = new DocumentRepository();
export const documentService = new DocumentService(documentRepository);

const invoiceRepository = new InvoiceRepository();
export const invoiceService = new InvoiceService(invoiceRepository);

const financeRepository = new FinanceRepository();
export const financeService = new FinanceService(financeRepository);

const homeRepository = new HomeRepository();
export const homeService = new HomeService(homeRepository);

const ideasRepository = new IdeasRepository();
export const ideasService = new IdeasService(ideasRepository);

const automationRepository = new AutomationRepository();
export const automationService = new AutomationService(automationRepository);

// ─── Email Advanced Features (P8-05) ──────────────────────────────────────

import { AuditService } from "@/lib/audit";

const telegramRepository = new TelegramRepository();
const auditService = new AuditService();
export const telegramService = new TelegramService(telegramRepository, auditService);

const cleanupRepository = new CleanupRepository();
export const cleanupService = new CleanupService(
  cleanupRepository,
  inboxRepository,
  auditService
);

// ─── Service Factory Function ──────────────────────────────────────────────

export function getServiceFactory() {
  return {
    inboxService,
    inboxRepository,
    taskService,
    taskRepository,
    documentService,
    documentRepository,
    invoiceService,
    invoiceRepository,
    financeService,
    financeRepository,
    homeService,
    homeRepository,
    ideasService,
    ideasRepository,
    automationService,
    automationRepository,
    telegramService,
    telegramRepository,
    cleanupService,
    cleanupRepository,
  };
}
