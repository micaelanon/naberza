import { prisma } from "@/lib/db";
import {
  EmailCleanupRule,
  EmailCleanupLog,
  CleanupRuleConfig,
  CreateCleanupRuleInput,
  UpdateCleanupRuleInput,
  CleanupRuleFilter,
  CleanupLogFilter,
  CleanupAction,
} from "./cleanup.types";

export class CleanupRepository {
  constructor() {}

  // ─────────────────────────────────────────────
  // Rule Management
  // ─────────────────────────────────────────────

  async createRule(userId: string, input: CreateCleanupRuleInput): Promise<EmailCleanupRule> {
    return prisma.emailCleanupRule.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        matchType: input.matchType,
        config: input.config,
        action: input.action,
        priority: input.priority || 0,
        dryRunEnabled: input.dryRunEnabled !== false,
        enabled: true,
      },
    });
  }

  async getRule(id: string): Promise<EmailCleanupRule | null> {
    return prisma.emailCleanupRule.findUnique({
      where: { id },
    });
  }

  async listRules(userId: string, filter?: CleanupRuleFilter): Promise<EmailCleanupRule[]> {
    return prisma.emailCleanupRule.findMany({
      where: {
        userId,
        ...(filter?.enabled !== undefined && { enabled: filter.enabled }),
        ...(filter?.matchType && { matchType: filter.matchType }),
        ...(filter?.action && { action: filter.action }),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateRule(id: string, input: UpdateCleanupRuleInput): Promise<EmailCleanupRule> {
    return prisma.emailCleanupRule.update({
      where: { id },
      data: input,
    });
  }

  async deleteRule(id: string): Promise<void> {
    await prisma.emailCleanupRule.delete({
      where: { id },
    });
  }

  async toggleRule(id: string, enabled: boolean): Promise<EmailCleanupRule> {
    return prisma.emailCleanupRule.update({
      where: { id },
      data: { enabled },
    });
  }

  async updateExecutionStats(
    id: string,
    matchedCount: number,
    executedCount: number,
    lastExecutedAt?: Date
  ): Promise<EmailCleanupRule> {
    return prisma.emailCleanupRule.update({
      where: { id },
      data: {
        matchedCount,
        executedCount,
        ...(lastExecutedAt && { lastExecutedAt }),
      },
    });
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
    return prisma.emailCleanupLog.create({
      data: {
        ruleId,
        inboxItemId,
        action,
        wasPreview,
      },
    });
  }

  async listLogs(ruleId: string, filter?: CleanupLogFilter): Promise<EmailCleanupLog[]> {
    return prisma.emailCleanupLog.findMany({
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
    const rules = await prisma.emailCleanupRule.findMany({
      where: { userId },
    });

    const totalMatched = rules.reduce((sum, r) => sum + r.matchedCount, 0);
    const totalExecuted = rules.reduce((sum, r) => sum + r.executedCount, 0);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter((r) => r.enabled).length,
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
    const logs = await prisma.emailCleanupLog.findMany({
      where: { ruleId },
      take: limit,
      orderBy: { executedAt: "desc" },
    });

    // Group by date
    const grouped = new Map<string, { matched: number; executed: number }>();
    for (const log of logs) {
      const date = log.executedAt.toISOString().split("T")[0];
      const key = date;
      if (!grouped.has(key)) {
        grouped.set(key, { matched: 0, executed: 0 });
      }
      const stats = grouped.get(key)!;
      stats.executed++;
      if (!log.wasPreview) {
        stats.matched++;
      }
    }

    return Array.from(grouped.entries()).map(([date, stats]) => ({
      date: new Date(date),
      ...stats,
    }));
  }
}
