import { InboxItem } from "@prisma/client";
import { eventBus } from "@/lib/events/event-bus";
import { AuditService } from "@/lib/audit";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
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
  CleanupLogFilter,
  SenderConfig,
  KeywordConfig,
  OldEmailsConfig,
} from "./cleanup.types";

export class CleanupService {
  constructor(
    private repository: CleanupRepository,
    private inboxRepository: InboxRepository,
    private auditService: AuditService
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
      actorDetail: userId,
      status: "SUCCESS",
      input: { name: input.name, matchType: input.matchType, action: input.action },
      output: { ruleId: rule.id },
    });

    eventBus.emit("email-cleanup.rule.created", {
      ruleId: rule.id,
      userId,
      matchType: input.matchType,
      action: input.action,
    });

    return rule;
  }

  async getRule(userId: string, ruleId: string): Promise<EmailCleanupRule | null> {
    const rule = await this.repository.getRule(ruleId);
    if (rule && rule.userId !== userId) {
      return null; // Unauthorized
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
      actorDetail: userId,
      status: "SUCCESS",
      input,
    });

    eventBus.emit("email-cleanup.rule.updated", {
      ruleId,
      userId,
      changes: input,
    });

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
      actorDetail: userId,
      status: "SUCCESS",
    });

    eventBus.emit("email-cleanup.rule.deleted", {
      ruleId,
      userId,
    });
  }

  async toggleRule(userId: string, ruleId: string, enabled: boolean): Promise<EmailCleanupRule> {
    const rule = await this.getRule(userId, ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    return this.repository.toggleRule(ruleId, enabled);
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

    for (const match of matches) {
      try {
        // Log the action
        await this.repository.createLog(ruleId, match.inboxItemId, rule.action, false);

        // Execute action (delete for now)
        if (rule.action === CleanupAction.DELETE) {
          // TODO: Call inbox service to delete/archive item
          // await this.inboxService.deleteItem(match.inboxItemId);
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

    // Update rule statistics
    await this.repository.updateExecutionStats(ruleId, matches.length, succeeded, new Date());

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
      action: "cleanup.executed",
      entityType: "EmailCleanupRule",
      entityId: ruleId,
      actorDetail: userId,
      status: succeeded > 0 ? "SUCCESS" : "FAILURE",
      output: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
    });

    eventBus.emit("email-cleanup.executed", {
      ruleId,
      userId,
      result,
    });

    return result;
  }

  // ─────────────────────────────────────────────
  // Matching Logic
  // ─────────────────────────────────────────────

  private async findMatches(rule: EmailCleanupRule): Promise<CleanupMatch[]> {
    // Get all email items
    const allItems = await this.inboxRepository.findMany({
      status: "PENDING",
      sourceType: "EMAIL",
    });

    const matches: CleanupMatch[] = [];

    for (const item of allItems) {
      if (this.ruleMatches(item, rule)) {
        matches.push({
          inboxItemId: item.id,
          title: item.title,
          senderEmail: this.extractSender(item),
          date: item.createdAt,
          preview: item.body?.substring(0, 100),
          matchedAt: new Date(),
        });
      }
    }

    return matches;
  }

  private ruleMatches(item: InboxItem, rule: EmailCleanupRule): boolean {
    switch (rule.matchType) {
      case CleanupMatchType.SENDER:
        return this.matchSender(item, rule.config as SenderConfig);
      case CleanupMatchType.KEYWORD:
        return this.matchKeyword(item, rule.config as KeywordConfig);
      case CleanupMatchType.NEWSLETTER:
        return this.matchNewsletter(item);
      case CleanupMatchType.OLD_EMAILS:
        return this.matchOldEmails(item, rule.config as OldEmailsConfig);
      case CleanupMatchType.SIZE_THRESHOLD:
        // TODO: Implement size matching
        return false;
      case CleanupMatchType.READ_STATUS:
        // TODO: Implement read status matching
        return false;
      default:
        return false;
    }
  }

  private matchSender(item: InboxItem, config: SenderConfig): boolean {
    const sender = this.extractSender(item)?.toLowerCase();
    if (!sender) return false;

    return config.senderEmails.some((email) => {
      const configEmail = email.toLowerCase();
      if (config.matchType === "domain") {
        const senderDomain = sender.split("@")[1];
        const configDomain = configEmail.split("@")[1];
        return senderDomain === configDomain;
      }
      return sender === configEmail;
    });
  }

  private matchKeyword(item: InboxItem, config: KeywordConfig): boolean {
    const searchText =
      config.searchIn === "subject"
        ? item.title
        : config.searchIn === "body"
          ? item.body || ""
          : (item.title + " " + (item.body || "")).toLowerCase();

    const keywords = config.caseSensitive ? config.keywords : config.keywords.map((k) => k.toLowerCase());
    const textToSearch = config.caseSensitive ? searchText : searchText.toLowerCase();

    if (config.matchAll) {
      return keywords.every((keyword) => textToSearch.includes(keyword));
    } else {
      return keywords.some((keyword) => textToSearch.includes(keyword));
    }
  }

  private matchNewsletter(item: InboxItem): boolean {
    // Check for common newsletter indicators
    const text = (item.title + " " + (item.body || "")).toLowerCase();
    const newsletterKeywords = [
      "unsubscribe",
      "newsletter",
      "marketing",
      "promotional",
      "one-click unsubscribe",
    ];
    return newsletterKeywords.some((keyword) => text.includes(keyword));
  }

  private matchOldEmails(item: InboxItem, config: OldEmailsConfig): boolean {
    const ageInMs = Date.now() - item.createdAt.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays >= config.ageInDays;
  }

  private extractSender(item: InboxItem): string | undefined {
    if (item.sourceRawPayload && typeof item.sourceRawPayload === "object") {
      const payload = item.sourceRawPayload as any;
      return payload.from || payload.sender || payload.senderEmail;
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
