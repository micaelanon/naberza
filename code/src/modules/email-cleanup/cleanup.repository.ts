import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  EmailCleanupRule,
  EmailCleanupLog,
  CreateCleanupRuleInput,
  UpdateCleanupRuleInput,
  CleanupRuleFilter,
  CleanupLogFilter,
  CleanupAction,
} from "./cleanup.types";

/**
 * CleanupRepository — thin wrapper around Prisma for email cleanup rules & logs.
 *
 * NOTE: If TypeScript complains about `prisma.emailCleanupRule` not existing,
 * run `npx prisma generate` to regenerate the Prisma client from the schema.
 */
export class CleanupRepository {
  // ─────────────────────────────────────────────
  // Rule Management
  // ─────────────────────────────────────────────

  async createRule(userId: string, input: CreateCleanupRuleInput): Promise<EmailCleanupRule> {
    const rule = await prisma.emailCleanupRule.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        matchType: input.matchType,
        config: input.config as unknown as Prisma.InputJsonValue,
        action: input.action,
        priority: input.priority ?? 0,
        dryRunEnabled: input.dryRunEnabled !== false,
        enabled: true,
      },
    });
    return rule as unknown as EmailCleanupRule;
  }

  async getRule(id: string): Promise<EmailCleanupRule | null> {
    const rule = await prisma.emailCleanupRule.findUnique({ where: { id } });
    return rule as unknown as EmailCleanupRule | null;
  }

  async listRules(userId: string, filter?: CleanupRuleFilter): Promise<EmailCleanupRule[]> {
    const rules = await prisma.emailCleanupRule.findMany({
      where: {
        userId,
        ...(filter?.enabled !== undefined && { enabled: filter.enabled }),
        ...(filter?.matchType && { matchType: filter.matchType }),
        ...(filter?.action && { action: filter.action }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return rules as unknown as EmailCleanupRule[];
  }

  async updateRule(id: string, input: UpdateCleanupRuleInput): Promise<EmailCleanupRule> {
    const data: Record<string, unknown> = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.action !== undefined && { action: input.action }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dryRunEnabled !== undefined && { dryRunEnabled: input.dryRunEnabled }),
    };
    if (input.config !== undefined) {
      data["config"] = input.config as unknown as Prisma.InputJsonValue;
    }

    const rule = await prisma.emailCleanupRule.update({
      where: { id },
      data: data as Prisma.EmailCleanupRuleUpdateInput,
    });
    return rule as unknown as EmailCleanupRule;
  }

  async deleteRule(id: string): Promise<void> {
    await prisma.emailCleanupRule.delete({ where: { id } });
  }

  async toggleRule(id: string, enabled: boolean): Promise<EmailCleanupRule> {
    const rule = await prisma.emailCleanupRule.update({
      where: { id },
      data: { enabled },
    });
    return rule as unknown as EmailCleanupRule;
  }

  async updateExecutionStats(
    id: string,
    matchedCount: number,
    executedCount: number,
    lastExecutedAt?: Date
  ): Promise<EmailCleanupRule> {
    const rule = await prisma.emailCleanupRule.update({
      where: { id },
      data: {
        matchedCount,
        executedCount,
        ...(lastExecutedAt && { lastExecutedAt }),
      },
    });
    return rule as unknown as EmailCleanupRule;
  }

  // ─────────────────────────────────────────────
  // Log Management
  // ─────────────────────────────────────────────

  async createLog(
    ruleId: string,
    inboxItemId: string,
    action: CleanupAction,
    wasPreview: boolean
  ): Promise<EmailCleanupLog> {
    const log = await prisma.emailCleanupLog.create({
      data: {
        ruleId,
        inboxItemId,
        action,
        wasPreview,
      },
    });
    return log as unknown as EmailCleanupLog;
  }

  async listLogs(ruleId: string, filter?: CleanupLogFilter): Promise<EmailCleanupLog[]> {
    const logs = await prisma.emailCleanupLog.findMany({
      where: {
        ruleId,
        ...(filter?.action && { action: filter.action }),
        executedAt: {
          ...(filter?.beforeDate && { lte: filter.beforeDate }),
          ...(filter?.afterDate && { gte: filter.afterDate }),
        },
      },
      orderBy: { executedAt: "desc" },
    });
    return logs as unknown as EmailCleanupLog[];
  }

  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const result = await prisma.emailCleanupLog.deleteMany({
      where: {
        executedAt: { lt: beforeDate },
        wasPreview: true, // Only delete preview logs
      },
    });
    return result.count;
  }

  // ─────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────

  async getRuleStats(userId: string) {
    const rules = (await prisma.emailCleanupRule.findMany({
      where: { userId },
    })) as unknown as EmailCleanupRule[];

    const totalMatched = rules.reduce((sum: number, r: EmailCleanupRule) => sum + r.matchedCount, 0);
    const totalExecuted = rules.reduce((sum: number, r: EmailCleanupRule) => sum + r.executedCount, 0);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter((r: EmailCleanupRule) => r.enabled).length,
      totalMatched,
      totalExecuted,
      rules,
    };
  }

  async getExecutionHistory(
    ruleId: string,
    limit: number = 50
  ): Promise<
    Array<{
      date: Date;
      matched: number;
      executed: number;
    }>
  > {
    const logs = (await prisma.emailCleanupLog.findMany({
      where: { ruleId },
      take: limit,
      orderBy: { executedAt: "desc" },
    })) as unknown as EmailCleanupLog[];

    // Group by date
    const grouped = new Map<string, { matched: number; executed: number }>();
    for (const log of logs) {
      const date = log.executedAt.toISOString().split("T")[0];
      if (!grouped.has(date)) {
        grouped.set(date, { matched: 0, executed: 0 });
      }
      const stats = grouped.get(date)!;
      stats.matched++;
      if (!log.wasPreview) {
        stats.executed++;
      }
    }

    return Array.from(grouped.entries()).map(([date, stats]) => ({
      date: new Date(date),
      ...stats,
    }));
  }
}
