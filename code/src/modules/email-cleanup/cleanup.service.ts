import type { InboxItem } from "@prisma/client";
import { eventBus } from "@/lib/events/event-bus";
import type { AuditService } from "@/lib/audit";
import type { InboxRepository } from "@/modules/inbox/inbox.repository";
import type { InboxService } from "@/modules/inbox/inbox.service";
import { CleanupRepository } from "./cleanup.repository";
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
 * IMPORTANT: The service depends on the Inbox module for reading/mutating
 * inbox items. The actual destructive action (DELETE / dismiss) goes through
 * InboxService when available; otherwise we use the repository directly.
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

    for (const match of matches) {
      try {
        // Log every attempted action (preview or real)
        await this.repository.createLog(ruleId, match.inboxItemId, rule.action, wasPreview);

        if (!wasPreview) {
          await this.applyAction(match.inboxItemId, rule.action);
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
   * Actually apply the cleanup action on an inbox item.
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

  private async findMatches(rule: EmailCleanupRule): Promise<CleanupMatch[]> {
    // Fetch a reasonable window of pending emails.
    // We fetch up to 500 items to keep latency reasonable; matching is linear.
    const { items } = await this.inboxRepository.findAll({
      status: "PENDING",
      sourceType: "EMAIL",
      pageSize: 500,
    });

    const matches: CleanupMatch[] = [];

    for (const item of items as unknown as InboxItem[]) {
      if (this.ruleMatches(item, rule)) {
        matches.push({
          inboxItemId: item.id,
          title: item.title,
          senderEmail: this.extractSender(item),
          date: item.createdAt,
          preview: item.body?.substring(0, 100) ?? undefined,
          matchedAt: new Date(),
        });
      }
    }

    return matches;
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
