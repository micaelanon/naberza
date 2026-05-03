import { classifyEmailBatch } from "@/lib/email-triage/email-classifier-vertex";
import type { EmailToClassify } from "@/lib/email-triage/email-classifier-vertex";
import type { MailImapAdapter, EmailMessage } from "@/lib/adapters/mail/mail-imap.adapter";
import type { EmailTriageRepository } from "./email-triage.repository";
import type { TriageSessionSummary, TriageItemView } from "./email-triage.types";

const FORCE_KEEP_HOURS = 48;

function mapEmailToClassify(email: EmailMessage): EmailToClassify {
  return {
    uid: email.uid,
    from: email.from,
    subject: email.subject,
    date: email.date,
    hasAttachments: email.attachments.length > 0,
    attachmentNames: email.attachments.map((a) => a.filename),
    isRead: email.isRead,
  };
}

export class EmailTriageService {
  constructor(
    private readonly repository: EmailTriageRepository,
    private readonly adapterFactory: () => MailImapAdapter,
  ) {}

  async startSession(): Promise<{ sessionId: string }> {
    const session = await this.repository.createSession("email-imap");

    // Start processing in background (non-blocking)
    this.processSession(session.id).catch(() => {
      // Session status updated to FAILED inside processSession
    });

    return { sessionId: session.id };
  }

  async executeSession(
    sessionId: string,
  ): Promise<{ trashed: number; errors: number }> {
    const session = await this.repository.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (session.status !== "READY") {
      throw new Error(
        `Session must be READY to execute, current: ${session.status}`,
      );
    }

    const trashItems = await this.repository.getItemsByDecision(
      sessionId,
      "TRASH",
    );

    if (trashItems.length === 0) {
      await this.repository.updateSessionStatus(sessionId, "DONE", {
        trashCount: 0,
      });
      return { trashed: 0, errors: 0 };
    }

    const adapter = this.adapterFactory();
    let errors = 0;
    for (const item of trashItems) {
      try {
        await adapter.trashMessage(item.uid);
        await this.repository.markItemExecuted(item.id);
      } catch {
        errors++;
      }
    }

    const trashed = trashItems.length - errors;

    await this.repository.updateSessionStatus(sessionId, "DONE", {
      trashCount: trashed,
    });

    return { trashed, errors };
  }

  async overrideDecision(
    itemId: string,
    decision: string,
  ): Promise<void> {
    await this.repository.overrideItemDecision(itemId, decision);
  }

  async overrideCategoryDecision(
    sessionId: string,
    _aiCategory: string,
    newDecision: string,
  ): Promise<void> {
    await this.repository.overrideSessionCategory(
      sessionId,
      _aiCategory,
      newDecision,
    );
  }

  async getSession(id: string): Promise<TriageSessionSummary | null> {
    return this.repository.getSession(id);
  }

  async getSessionItems(
    sessionId: string,
    filter?: { decision?: string },
  ): Promise<TriageItemView[]> {
    return this.repository.getSessionItems(sessionId, filter);
  }

  async listSessions(limit = 10): Promise<TriageSessionSummary[]> {
    return this.repository.listSessions(limit);
  }

  // ── Private helpers ──────────────────────────────

  private async processSession(sessionId: string): Promise<void> {
    try {
      await this.repository.updateSessionStatus(sessionId, "FETCHING");

      // Fetch emails from IMAP adapter
      const adapter = this.adapterFactory();
      const emails = await adapter.fetchNewMessages();

      await this.repository.updateSessionStatus(sessionId, "CLASSIFYING", {
        totalFetched: emails.length,
      });

      // Build EmailToClassify array with safety rules
      const now = new Date();
      const aiBatch: EmailMessage[] = [];
      const keepEmails: Array<{ email: EmailMessage; reason: string }> = [];
      const reviewEmails: Array<{ email: EmailMessage; reason: string }> = [];

      for (const email of emails) {
        const hoursOld =
          (now.getTime() - email.date.getTime()) / 3600000;

        if (hoursOld < FORCE_KEEP_HOURS) {
          keepEmails.push({ email, reason: "Email de menos de 48 horas" });
          continue;
        }

        const hasPdf = email.attachments.some((a) =>
          a.filename.toLowerCase().endsWith(".pdf"),
        );
        if (hasPdf) {
          reviewEmails.push({
            email,
            reason: "Contiene adjuntos PDF",
          });
          continue;
        }

        aiBatch.push(email);
      }

      // Classify remaining emails with AI
      const classified = await classifyEmailBatch(
        aiBatch.map(mapEmailToClassify),
      );

      // Map AI results back to emails
      const classifiedByUid = new Map(
        classified.map((c) => [c.uid, c]),
      );
      const aiResults = aiBatch.map((email) => {
        const result = classifiedByUid.get(email.uid);
        return {
          email,
          decision: result?.decision ?? "review",
          reason: result?.reason ?? null,
          confidence: result?.confidence ?? null,
          category: result?.category ?? null,
        };
      });

      // Build all items for persistence
      const allItems: Array<{
        uid: number;
        fromAddress: string;
        subject: string;
        emailDate: Date;
        hasAttachments: boolean;
        aiDecision: string;
        aiReason: string | null;
        aiConfidence: number | null;
        aiCategory: string | null;
      }> = [];

      // Force-kept emails
      for (const { email, reason } of keepEmails) {
        allItems.push({
          uid: email.uid,
          fromAddress: email.from,
          subject: email.subject,
          emailDate: email.date,
          hasAttachments: email.attachments.length > 0,
          aiDecision: "KEEP",
          aiReason: reason,
          aiConfidence: 1,
          aiCategory: "recent",
        });
      }

      // Force-review emails (PDF attachments)
      for (const { email, reason } of reviewEmails) {
        allItems.push({
          uid: email.uid,
          fromAddress: email.from,
          subject: email.subject,
          emailDate: email.date,
          hasAttachments: email.attachments.length > 0,
          aiDecision: "REVIEW",
          aiReason: reason,
          aiConfidence: 1,
          aiCategory: "pdf-attachment",
        });
      }

      // AI-classified emails
      for (const r of aiResults) {
        allItems.push({
          uid: r.email.uid,
          fromAddress: r.email.from,
          subject: r.email.subject,
          emailDate: r.email.date,
          hasAttachments: r.email.attachments.length > 0,
          aiDecision: r.decision.toUpperCase(),
          aiReason: r.reason,
          aiConfidence: r.confidence,
          aiCategory: r.category,
        });
      }

      // Persist all items
      if (allItems.length > 0) {
        await this.repository.upsertItems(
          sessionId,
          allItems.map((item) => ({
            sessionId,
            uid: item.uid,
            fromAddress: item.fromAddress,
            subject: item.subject,
            emailDate: item.emailDate,
            hasAttachments: item.hasAttachments,
            aiDecision: item.aiDecision as never,
            aiReason: item.aiReason,
            aiConfidence: item.aiConfidence,
            aiCategory: item.aiCategory,
          })),
        );
      }

      // Calculate and update counts
      const trashCount = allItems.filter(
        (i) => i.aiDecision === "TRASH",
      ).length;
      const archiveCount = allItems.filter(
        (i) => i.aiDecision === "ARCHIVE",
      ).length;
      const keepCount = allItems.filter(
        (i) => i.aiDecision === "KEEP",
      ).length;
      const reviewCount = allItems.filter(
        (i) => i.aiDecision === "REVIEW",
      ).length;

      await this.repository.updateSessionStatus(sessionId, "READY", {
        totalProcessed: allItems.length,
        trashCount,
        archiveCount,
        keepCount,
        reviewCount,
      });
    } catch {
      await this.repository
        .updateSessionStatus(sessionId, "FAILED")
        .catch(() => {});
    }
  }
}
