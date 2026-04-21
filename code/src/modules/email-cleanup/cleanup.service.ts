import type { InboxItem } from "@prisma/client";
import { eventBus } from "@/lib/events/event-bus";
import type { AuditService } from "@/lib/audit";
import type { InboxRepository } from "@/modules/inbox/inbox.repository";
import type { InboxService } from "@/modules/inbox/inbox.service";
import { CleanupRepository } from "./cleanup.repository";
import type { MailImapAdapter } from "@/lib/adapters/mail/mail-imap.adapter";
import type { EmailMessage } from "@/lib/adapters/mail/mail-imap.adapter";
import { prisma } from "@/lib/db";
import {
  EmailCleanupRule,
  CleanupMatchType,
  CleanupAction,
  CreateCleanupRuleInput,
  UpdateCleanupRuleInput,
  CleanupMatch,
  CleanupPreviewResult,
  CleanupExecutionResult,
  CleanupRuleFilter,
  SenderConfig,
  KeywordConfig,
  OldEmailsConfig,
  NewsletterConfig,
  ReadStatusConfig,
} from "./cleanup.types";

/**
 * CleanupService
 *
 * Orchestrates email cleanup rules: CRUD, previewing matches,
 * executing cleanups and maintaining audit + event logs.
 *
 * IMPORTANT: Now searches emails directly via IMAP instead of database.
 * - Fetches live emails from user's IMAP account using MailImapAdapter
 * - Applies matching logic to emails in-flight (no database storage required)
 * - Returns matches for preview or execution
 * - Never stores user emails in the database
 */
export class CleanupService {
  constructor(
    private readonly repository: CleanupRepository,
    private readonly inboxRepository: InboxRepository,
    private readonly auditService: AuditService,
    private readonly inboxService?: InboxService
  ) {}

  // ─────────────────────────────────────────────
  // Rule Management
  // ─────────────────────────────────────────────

  async createRule(userId: string, input: CreateCleanupRuleInput): Promise<EmailCleanupRule> {
    const rule = await this.repository.createRule(userId, input);

    await this.auditService.log({
      module: "email-cleanup",
      action: "rule.created",
      entityType: "EmailCleanupRule",
      entityId: rule.id,
      actor: "user",
      actorDetail: userId,
      status: "success",
      input: { name: input.name, matchType: input.matchType, action: input.action },
      output: { ruleId: rule.id },
    });

    // Use untyped emit since cleanup events are not yet registered in DomainEventMap
    (eventBus as unknown as { emit: (name: string, payload: unknown) => void }).emit(
      "email-cleanup.rule.created",
      {
        ruleId: rule.id,
        userId,
        matchType: input.matchType,
        action: input.action,
      }
    );

    return rule;
  }

  async getRule(userId: string, ruleId: string): Promise<EmailCleanupRule | null> {
    const rule = await this.repository.getRule(ruleId);
    if (rule && rule.userId !== userId) {
      return null; // Unauthorized — treat as not-found to avoid leaking existence
    }
    return rule;
  }

  async listRules(userId: string, filter?: CleanupRuleFilter): Promise<EmailCleanupRule[]> {
    return this.repository.listRules(userId, filter);
  }

  async updateRule(
    userId: string,
    ruleId: string,
    input: UpdateCleanupRuleInput
  ): Promise<EmailCleanupRule> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const updated = await this.repository.updateRule(ruleId, input);

    await this.auditService.log({
      module: "email-cleanup",
      action: "rule.updated",
      entityType: "EmailCleanupRule",
      entityId: ruleId,
      actor: "user",
      actorDetail: userId,
      status: "success",
      input: input as unknown as Record<string, unknown>,
    });

    (eventBus as unknown as { emit: (name: string, payload: unknown) => void }).emit(
      "email-cleanup.rule.updated",
      {
        ruleId,
        userId,
        changes: input,
      }
    );

    return updated;
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    await this.repository.deleteRule(ruleId);

    await this.auditService.log({
      module: "email-cleanup",
      action: "rule.deleted",
      entityType: "EmailCleanupRule",
      entityId: ruleId,
      actor: "user",
      actorDetail: userId,
      status: "success",
    });

    (eventBus as unknown as { emit: (name: string, payload: unknown) => void }).emit(
      "email-cleanup.rule.deleted",
      {
        ruleId,
        userId,
      }
    );
  }

  async toggleRule(userId: string, ruleId: string, enabled: boolean): Promise<EmailCleanupRule> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const updated = await this.repository.toggleRule(ruleId, enabled);

    await this.auditService.log({
      module: "email-cleanup",
      action: enabled ? "rule.enabled" : "rule.disabled",
      entityType: "EmailCleanupRule",
      entityId: ruleId,
      actor: "user",
      actorDetail: userId,
      status: "success",
    });

    return updated;
  }

  // ─────────────────────────────────────────────
  // Preview & Execution
  // ─────────────────────────────────────────────

  async previewMatches(userId: string, ruleId: string): Promise<CleanupPreviewResult> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const matches = await this.findMatches(rule);

    return {
      ruleId,
      ruleName: rule.name,
      totalMatches: matches.length,
      matches: matches.slice(0, 50), // Limit preview to 50
      estimatedEffect: `${rule.action.toLowerCase()} ${matches.length} email${matches.length !== 1 ? "s" : ""}`,
    };
  }

  async executeCleanup(userId: string, ruleId: string): Promise<CleanupExecutionResult> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    if (!rule.enabled) {
      throw new Error("Rule is disabled");
    }

    const matches = await this.findMatches(rule);
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ itemId: string; error: string }> = [];

    const wasPreview = rule.dryRunEnabled;

    // For IMAP execution, we apply actions directly to IMAP adapter
    // Matches contain imapMetadata with UID for IMAP operations
    for (const match of matches) {
      try {
        // Log every attempted action (preview or real)
        await this.repository.createLog(ruleId, match.inboxItemId, rule.action, wasPreview);

        if (!wasPreview && match.imapMetadata) {
          // Apply IMAP action using UID from metadata
          await this.applyIMAPActionWithMatch(match, rule.action);
        }

        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          itemId: match.inboxItemId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update rule statistics — always track matchedCount, only increment executedCount for real runs
    await this.repository.updateExecutionStats(
      ruleId,
      matches.length,
      wasPreview ? rule.executedCount : rule.executedCount + succeeded,
      new Date()
    );

    const result: CleanupExecutionResult = {
      ruleId,
      ruleName: rule.name,
      action: rule.action,
      processed: matches.length,
      succeeded,
      failed,
      errors,
      executedAt: new Date(),
    };

    await this.auditService.log({
      module: "email-cleanup",
      action: wasPreview ? "cleanup.previewed" : "cleanup.executed",
      entityType: "EmailCleanupRule",
      entityId: ruleId,
      actor: "user",
      actorDetail: userId,
      status: failed === 0 ? "success" : succeeded > 0 ? "success" : "failure",
      output: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        dryRun: wasPreview,
      },
    });

    (eventBus as unknown as { emit: (name: string, payload: unknown) => void }).emit(
      "email-cleanup.executed",
      {
        ruleId,
        userId,
        result,
      }
    );

    return result;
  }

  /**
   * Apply cleanup action directly via IMAP to a matched email.
   * Uses the UID from imapMetadata to perform the actual IMAP operation.
   */
  private async applyIMAPActionWithMatch(match: CleanupMatch, action: CleanupAction): Promise<void> {
    if (!match.imapMetadata) {
      throw new Error("Missing IMAP metadata for action execution");
    }

    try {
      // Get the IMAP connection from database
      const imapConnection = await prisma.sourceConnection.findUnique({
        where: { id: match.imapMetadata.connectionId },
      });

      if (!imapConnection) {
        throw new Error("IMAP connection not found");
      }

      // Create IMAP adapter
      const { MailImapAdapter } = await import("@/lib/adapters/mail/mail-imap.adapter");
      const imapAdapter = new MailImapAdapter({
        id: imapConnection.id,
        name: imapConnection.name,
        type: "email_imap",
        status: imapConnection.status as any,
        permissions: {
          read: imapConnection.permissionRead,
          write: imapConnection.permissionWrite,
        },
        config: imapConnection.config,
      });

      // Execute the action on IMAP
      switch (action) {
        case CleanupAction.DELETE: {
          await imapAdapter.deleteMessage(match.imapMetadata.uid);
          break;
        }
        case CleanupAction.ARCHIVE: {
          await imapAdapter.archiveMessage(match.imapMetadata.uid);
          break;
        }
        case CleanupAction.LABEL: {
          await imapAdapter.addLabel(match.imapMetadata.uid, "cleanup_applied");
          break;
        }
        case CleanupAction.MOVE_TO_FOLDER: {
          // For now, treat similar to archive (move to All Mail / Archive)
          await imapAdapter.archiveMessage(match.imapMetadata.uid);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to apply ${action} via IMAP: ${message}`);
    }
  }

  /**
   * Actually apply the cleanup action on an inbox item (database fallback).
   * - DELETE/ARCHIVE: dismiss the item (soft delete — keeps audit trail).
   *   Use InboxService if available so the right events fire.
   * - LABEL/MOVE_TO_FOLDER: update metadata to tag the item (non-destructive).
   */
  private async applyAction(inboxItemId: string, action: CleanupAction): Promise<void> {
    switch (action) {
      case CleanupAction.DELETE:
      case CleanupAction.ARCHIVE: {
        if (this.inboxService) {
          await this.inboxService.dismissItem(inboxItemId);
        } else {
          await this.inboxRepository.dismiss(inboxItemId);
        }
        return;
      }
      case CleanupAction.LABEL:
      case CleanupAction.MOVE_TO_FOLDER: {
        // Non-destructive: tag item metadata so user can filter on it later.
        const item = await this.inboxRepository.findById(inboxItemId);
        if (!item) return;
        const metadata = (item.metadata as Record<string, unknown>) ?? {};
        const labels = Array.isArray(metadata["cleanupLabels"])
          ? (metadata["cleanupLabels"] as string[])
          : [];
        labels.push(action === CleanupAction.LABEL ? "labeled" : "moved");
        await this.inboxRepository.update(inboxItemId, {
          metadata: { ...metadata, cleanupLabels: labels },
        });
        return;
      }
      default:
        return;
    }
  }

  // ─────────────────────────────────────────────
  // Matching Logic
  // ─────────────────────────────────────────────

  /**
   * Find matching emails by fetching directly from user's IMAP account.
   *
   * IMPORTANT: This now searches LIVE emails via IMAP, not the database.
   * - Connects to user's configured IMAP account (Gmail, etc.)
   * - Fetches recent unread emails (configurable window)
   * - Applies matching logic in real-time
   * - Returns preview-ready CleanupMatch objects
   * - Does NOT store emails in database
   */
  private async findMatches(rule: EmailCleanupRule): Promise<CleanupMatch[]> {
    try {
      // Get user's IMAP connection from database
      const imapConnection = await prisma.sourceConnection.findFirst({
        where: {
          type: "EMAIL_IMAP",
          status: "ACTIVE",
        },
      });

      if (!imapConnection) {
        throw new Error(
          "No active IMAP connection found. Please configure your email account in Settings > Integrations."
        );
      }

      // Create IMAP adapter with the stored configuration
      const { MailImapAdapter } = await import("@/lib/adapters/mail/mail-imap.adapter");
      const imapAdapter = new MailImapAdapter({
        id: imapConnection.id,
        name: imapConnection.name,
        type: "email_imap",
        status: imapConnection.status as any,
        permissions: {
          read: imapConnection.permissionRead,
          write: imapConnection.permissionWrite,
        },
        config: imapConnection.config,
      });

      // Fetch recent emails from IMAP (last 30 days, unread preference)
      const emailMessages = await imapAdapter.fetchNewMessages(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const matches: CleanupMatch[] = [];

      // Apply matching logic to live IMAP emails
      for (const email of emailMessages) {
        if (this.ruleMatchesEmail(email, rule)) {
          matches.push({
            // Use email messageId as identifier
            inboxItemId: email.messageId,
            title: email.subject,
            senderEmail: email.from,
            date: email.date,
            preview: email.body?.substring(0, 100) ?? undefined,
            matchedAt: new Date(),
            // Store IMAP metadata for execution phase
            imapMetadata: {
              uid: email.uid,
              connectionId: imapConnection.id,
              messageId: email.messageId,
            },
          });
        }
      }

      return matches;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error fetching emails";
      throw new Error(`Failed to fetch emails from IMAP: ${message}`);
    }
  }

  /**
   * Apply rule matching logic to a live IMAP EmailMessage.
   * Similar to ruleMatches() but works with EmailMessage instead of InboxItem.
   */
  private ruleMatchesEmail(email: EmailMessage, rule: EmailCleanupRule): boolean {
    switch (rule.matchType) {
      case CleanupMatchType.SENDER:
        return this.matchSenderEmail(email, rule.config as unknown as SenderConfig);
      case CleanupMatchType.KEYWORD:
        return this.matchKeywordEmail(email, rule.config as unknown as KeywordConfig);
      case CleanupMatchType.NEWSLETTER:
        return this.matchNewsletterEmail(email, rule.config as unknown as NewsletterConfig);
      case CleanupMatchType.OLD_EMAILS:
        return this.matchOldEmailsDate(email, rule.config as unknown as OldEmailsConfig);
      case CleanupMatchType.READ_STATUS:
        return this.matchReadStatusEmail(email, rule.config as unknown as ReadStatusConfig);
      case CleanupMatchType.SIZE_THRESHOLD:
        // Size not tracked on EmailMessage — skip gracefully
        return false;
      default:
        return false;
    }
  }

  private ruleMatches(item: InboxItem, rule: EmailCleanupRule): boolean {
    switch (rule.matchType) {
      case CleanupMatchType.SENDER:
        return this.matchSender(item, rule.config as unknown as SenderConfig);
      case CleanupMatchType.KEYWORD:
        return this.matchKeyword(item, rule.config as unknown as KeywordConfig);
      case CleanupMatchType.NEWSLETTER:
        return this.matchNewsletter(item, rule.config as unknown as NewsletterConfig);
      case CleanupMatchType.OLD_EMAILS:
        return this.matchOldEmails(item, rule.config as unknown as OldEmailsConfig);
      case CleanupMatchType.READ_STATUS:
        return this.matchReadStatus(item, rule.config as unknown as ReadStatusConfig);
      case CleanupMatchType.SIZE_THRESHOLD:
        // Size not tracked on InboxItem — skip gracefully
        return false;
      default:
        return false;
    }
  }

  // ─────────────────────────────────────────────
  // Matching Logic for Live IMAP Emails
  // ─────────────────────────────────────────────

  private matchSenderEmail(email: EmailMessage, config: SenderConfig): boolean {
    const sender = email.from?.toLowerCase();
    if (!sender || !config.senderEmails?.length) return false;

    return config.senderEmails.some((senderEmail) => {
      const target = senderEmail.toLowerCase().trim();
      if (!target) return false;

      if (config.matchType === "domain") {
        // Accept either "@example.com", "example.com" or "anything@example.com"
        const targetDomain = target.includes("@") ? target.split("@")[1] : target.replace(/^@/, "");
        const senderDomain = sender.includes("@") ? sender.split("@")[1] : sender;
        return senderDomain === targetDomain;
      }

      return sender === target;
    });
  }

  private matchKeywordEmail(email: EmailMessage, config: KeywordConfig): boolean {
    if (!config.keywords?.length) return false;

    const rawText =
      config.searchIn === "subject"
        ? email.subject
        : config.searchIn === "body"
          ? email.body ?? ""
          : `${email.subject} ${email.body ?? ""}`;

    const haystack = config.caseSensitive ? rawText : rawText.toLowerCase();
    const needles = config.caseSensitive
      ? config.keywords.filter(Boolean)
      : config.keywords.map((k) => k.toLowerCase()).filter(Boolean);

    if (!needles.length) return false;

    return config.matchAll
      ? needles.every((k) => haystack.includes(k))
      : needles.some((k) => haystack.includes(k));
  }

  private matchNewsletterEmail(email: EmailMessage, config?: NewsletterConfig): boolean {
    const text = `${email.subject} ${email.body ?? ""}`.toLowerCase();
    const sender = email.from?.toLowerCase() ?? "";

    // 1. Sender looks like a marketing address
    if (
      /^(noreply|no-reply|newsletter|mailing|marketing|news|info|hello|hola)@/.test(sender) ||
      /^.*@(mail|e|news|newsletter|marketing|campaigns|em)\./.test(sender)
    ) {
      return true;
    }

    // 2. Body mentions unsubscribe / newsletter
    if (text.includes("unsubscribe") || text.includes("darse de baja") || text.includes("cancelar suscripción")) {
      return true;
    }

    // 3. Marketing keywords in subject/body
    const marketingKeywords = config?.marketingKeywords?.length
      ? config.marketingKeywords.map((k) => k.toLowerCase())
      : [
          "newsletter",
          "boletín",
          "boletin",
          "promoción",
          "promocion",
          "descuento",
          "oferta",
          "rebaja",
          "sale",
          "discount",
          "% off",
          "promo",
          "deal",
        ];

    return marketingKeywords.some((k) => text.includes(k));
  }

  private matchOldEmailsDate(email: EmailMessage, config: OldEmailsConfig): boolean {
    const cutoff = config.beforeDate
      ? new Date(config.beforeDate).getTime()
      : Date.now() - (config.ageInDays ?? 90) * 24 * 60 * 60 * 1000;
    return email.date.getTime() <= cutoff;
  }

  private matchReadStatusEmail(email: EmailMessage, config: ReadStatusConfig): boolean {
    if (!config?.readStatus || config.readStatus === "any") return true;
    // EmailMessage has isRead property directly
    if (config.readStatus === "read") return email.isRead;
    if (config.readStatus === "unread") return !email.isRead;
    return false;
  }

  // ─────────────────────────────────────────────
  // Matching Logic for Database InboxItems (fallback)
  // ─────────────────────────────────────────────

  private matchSender(item: InboxItem, config: SenderConfig): boolean {
    const sender = this.extractSender(item)?.toLowerCase();
    if (!sender || !config.senderEmails?.length) return false;

    return config.senderEmails.some((email) => {
      const target = email.toLowerCase().trim();
      if (!target) return false;

      if (config.matchType === "domain") {
        // Accept either "@example.com", "example.com" or "anything@example.com"
        const targetDomain = target.includes("@") ? target.split("@")[1] : target.replace(/^@/, "");
        const senderDomain = sender.includes("@") ? sender.split("@")[1] : sender;
        return senderDomain === targetDomain;
      }

      return sender === target;
    });
  }

  private matchKeyword(item: InboxItem, config: KeywordConfig): boolean {
    if (!config.keywords?.length) return false;

    const rawText =
      config.searchIn === "subject"
        ? item.title
        : config.searchIn === "body"
          ? item.body ?? ""
          : `${item.title} ${item.body ?? ""}`;

    const haystack = config.caseSensitive ? rawText : rawText.toLowerCase();
    const needles = config.caseSensitive
      ? config.keywords.filter(Boolean)
      : config.keywords.map((k) => k.toLowerCase()).filter(Boolean);

    if (!needles.length) return false;

    return config.matchAll
      ? needles.every((k) => haystack.includes(k))
      : needles.some((k) => haystack.includes(k));
  }

  /**
   * Newsletter heuristic — any of:
   * - "unsubscribe" present in body
   * - "list-unsubscribe" header in raw payload
   * - marketing keywords (promo/newsletter/offer/sale/discount)
   * - sender looks like a noreply / newsletter mailbox
   */
  private matchNewsletter(item: InboxItem, config?: NewsletterConfig): boolean {
    const text = `${item.title} ${item.body ?? ""}`.toLowerCase();
    const sender = this.extractSender(item)?.toLowerCase() ?? "";

    // 1. Explicit list-unsubscribe header
    const payload = (item.sourceRawPayload as Record<string, unknown>) || {};
    const headers = (payload["headers"] as Record<string, unknown>) || {};
    const hasListUnsubscribe = Boolean(
      headers["list-unsubscribe"] ||
        headers["List-Unsubscribe"] ||
        payload["listUnsubscribe"] ||
        payload["List-Unsubscribe"]
    );
    if (hasListUnsubscribe) return true;

    // 2. Body mentions unsubscribe / newsletter
    if (text.includes("unsubscribe") || text.includes("darse de baja") || text.includes("cancelar suscripción")) {
      return true;
    }

    // 3. Sender looks like a marketing address
    if (
      /^(noreply|no-reply|newsletter|mailing|marketing|news|info|hello|hola)@/.test(sender) ||
      /^.*@(mail|e|news|newsletter|marketing|campaigns|em)\./.test(sender)
    ) {
      return true;
    }

    // 4. Marketing keywords in subject/body
    const marketingKeywords = config?.marketingKeywords?.length
      ? config.marketingKeywords.map((k) => k.toLowerCase())
      : [
          "newsletter",
          "boletín",
          "boletin",
          "promoción",
          "promocion",
          "descuento",
          "oferta",
          "rebaja",
          "sale",
          "discount",
          "% off",
          "promo",
          "deal",
        ];

    return marketingKeywords.some((k) => text.includes(k));
  }

  private matchOldEmails(item: InboxItem, config: OldEmailsConfig): boolean {
    const cutoff = config.beforeDate
      ? new Date(config.beforeDate).getTime()
      : Date.now() - (config.ageInDays ?? 90) * 24 * 60 * 60 * 1000;
    return item.createdAt.getTime() <= cutoff;
  }

  private matchReadStatus(item: InboxItem, config: ReadStatusConfig): boolean {
    if (!config?.readStatus || config.readStatus === "any") return true;
    // Read status is not directly tracked on InboxItem; use `processedAt` as a proxy
    const isRead = Boolean(item.processedAt);
    if (config.readStatus === "read") return isRead;
    if (config.readStatus === "unread") return !isRead;
    return false;
  }

  private extractSender(item: InboxItem): string | undefined {
    if (!item.sourceRawPayload) return undefined;
    if (typeof item.sourceRawPayload !== "object") return undefined;

    const payload = item.sourceRawPayload as Record<string, unknown>;
    const candidate = payload["from"] ?? payload["sender"] ?? payload["senderEmail"];

    if (typeof candidate === "string") {
      // Extract email from "Name <email@x.com>" form
      const emailMatch = candidate.match(/<([^>]+)>/);
      return (emailMatch ? emailMatch[1] : candidate).trim();
    }

    if (candidate && typeof candidate === "object") {
      const maybeEmail = (candidate as Record<string, unknown>)["address"] ?? (candidate as Record<string, unknown>)["email"];
      if (typeof maybeEmail === "string") return maybeEmail.trim();
    }

    return undefined;
  }

  // ─────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────

  async getStats(userId: string) {
    return this.repository.getRuleStats(userId);
  }

  async getExecutionHistory(userId: string, ruleId: string) {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }
    return this.repository.getExecutionHistory(ruleId);
  }
}
