import { describe, it, expect } from "vitest";

import { inboxService, taskService, documentService, invoiceService, financeService, homeService, ideasService, automationService } from "../service-factory";
import { InboxService } from "@/modules/inbox/inbox.service";
import { TaskService } from "@/modules/tasks/task.service";
import { DocumentService } from "@/modules/documents/document.service";
import { InvoiceService } from "@/modules/invoices/invoice.service";
import { FinanceService } from "@/modules/finance/finance.service";
import { HomeService } from "@/modules/home/home.service";
import { IdeasService } from "@/modules/ideas/ideas.service";
import { AutomationService } from "@/modules/automations/automation.service";

describe("ServiceFactory", () => {
  it("exports singleton services with correct types", () => {
    expect(inboxService).toBeInstanceOf(InboxService);
    expect(taskService).toBeInstanceOf(TaskService);
    expect(documentService).toBeInstanceOf(DocumentService);
    expect(invoiceService).toBeInstanceOf(InvoiceService);
    expect(financeService).toBeInstanceOf(FinanceService);
    expect(homeService).toBeInstanceOf(HomeService);
    expect(ideasService).toBeInstanceOf(IdeasService);
    expect(automationService).toBeInstanceOf(AutomationService);
  });
});
