import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { TriageItemView, TriageSessionSummary } from "./email-triage.types";

export class EmailTriageRepository {
  async createSession(connectionId: string) {
    return prisma.emailTriageSession.create({
      data: { connectionId },
    });
  }

  async updateSessionStatus(
    id: string,
    status: string,
    counts?: {
      totalFetched?: number;
      totalProcessed?: number;
      trashCount?: number;
      archiveCount?: number;
      keepCount?: number;
      reviewCount?: number;
    },
  ): Promise<void> {
    await prisma.emailTriageSession.update({
      where: { id },
      data: { status: status as never, ...counts },
    });
  }

  async upsertItems(
    _sessionId: string,
    items: Prisma.EmailTriageItemCreateManyInput[],
  ): Promise<void> {
    await prisma.emailTriageItem.createMany({
      data: items,
    });
  }

  async getSession(id: string): Promise<TriageSessionSummary | null> {
    const session = await prisma.emailTriageSession.findUnique({
      where: { id },
    });
    if (!session) return null;

    return {
      id: session.id,
      status: session.status,
      totalFetched: session.totalFetched,
      totalProcessed: session.totalProcessed,
      trashCount: session.trashCount,
      archiveCount: session.archiveCount,
      keepCount: session.keepCount,
      reviewCount: session.reviewCount,
      createdAt: session.createdAt,
      executedAt: session.executedAt,
    };
  }

  async getSessionItems(
    sessionId: string,
    filter?: { decision?: string },
  ): Promise<TriageItemView[]> {
    const items = await prisma.emailTriageItem.findMany({
      where: {
        sessionId,
        ...(filter?.decision
          ? { aiDecision: filter.decision as never }
          : {}),
      },
      orderBy: { emailDate: "desc" },
    });

    return items.map((item) => ({
      id: item.id,
      uid: item.uid,
      fromAddress: item.fromAddress,
      subject: item.subject,
      emailDate: item.emailDate,
      hasAttachments: item.hasAttachments,
      effectiveDecision: item.userDecision ?? item.aiDecision,
      aiDecision: item.aiDecision,
      aiReason: item.aiReason,
      aiConfidence: item.aiConfidence,
      aiCategory: item.aiCategory,
      userDecision: item.userDecision,
      executed: item.executed,
    }));
  }

  async overrideItemDecision(
    itemId: string,
    decision: string,
  ): Promise<void> {
    await prisma.emailTriageItem.update({
      where: { id: itemId },
      data: { userDecision: decision as never },
    });
  }

  async markItemExecuted(itemId: string): Promise<void> {
    await prisma.emailTriageItem.update({
      where: { id: itemId },
      data: { executed: true, executedAt: new Date() },
    });
  }

  async listSessions(limit = 10): Promise<TriageSessionSummary[]> {
    const sessions = await prisma.emailTriageSession.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return sessions.map((s) => ({
      id: s.id,
      status: s.status,
      totalFetched: s.totalFetched,
      totalProcessed: s.totalProcessed,
      trashCount: s.trashCount,
      archiveCount: s.archiveCount,
      keepCount: s.keepCount,
      reviewCount: s.reviewCount,
      createdAt: s.createdAt,
      executedAt: s.executedAt,
    }));
  }

  async getItemsByDecision(
    sessionId: string,
    decision: string,
  ): Promise<{ id: string; uid: number }[]> {
    return prisma.emailTriageItem.findMany({
      where: {
        sessionId,
        OR: [
          { userDecision: decision as never },
          { userDecision: null, aiDecision: decision as never },
        ],
        executed: false,
      },
      select: { id: true, uid: true },
    });
  }

  async markExecutedAt(
    sessionId: string,
    executedAt: Date,
  ): Promise<void> {
    await prisma.emailTriageSession.update({
      where: { id: sessionId },
      data: { status: "EXECUTING" as never, executedAt },
    });
  }

  async overrideSessionCategory(
    sessionId: string,
    aiCategory: string,
    newDecision: string,
  ): Promise<number> {
    const result = await prisma.emailTriageItem.updateMany({
      where: {
        sessionId,
        aiCategory,
        userDecision: null,
      },
      data: { userDecision: newDecision as never },
    });
    return result.count;
  }
}
