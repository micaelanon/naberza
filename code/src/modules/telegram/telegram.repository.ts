import { prisma } from "@/lib/db";
import {
  TelegramPreference,
  TelegramAlert,
  TelegramMessage,
  CreateTelegramPreferenceInput,
  UpdateTelegramPreferenceInput,
  CreateTelegramAlertInput,
  UpdateTelegramAlertInput,
  CreateTelegramMessageInput,
  TelegramAlertFilter,
  TelegramMessageFilter,
} from "./telegram.types";

export class TelegramRepository {
  constructor() {}

  // ─────────────────────────────────────────────
  // Telegram Preference operations
  // ─────────────────────────────────────────────

  async createPreference(
    input: CreateTelegramPreferenceInput
  ): Promise<TelegramPreference> {
    return prisma.telegramPreference.create({
      data: {
        userId: input.userId,
        telegramUserId: input.telegramUserId,
        telegramUsername: input.telegramUsername,
        telegramEnabled: false,
      },
    });
  }

  async getPreferenceByUserId(userId: string): Promise<TelegramPreference | null> {
    return this.db.telegramPreference.findUnique({
      where: { userId },
    });
  }

  async getPreferenceByTelegramId(telegramUserId: number): Promise<TelegramPreference | null> {
    return this.db.telegramPreference.findFirst({
      where: { telegramUserId },
    });
  }

  async updatePreference(
    id: string,
    input: UpdateTelegramPreferenceInput
  ): Promise<TelegramPreference> {
    return this.db.telegramPreference.update({
      where: { id },
      data: input,
    });
  }

  async deletePreference(id: string): Promise<void> {
    await this.db.telegramPreference.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────
  // Telegram Alert operations
  // ─────────────────────────────────────────────

  async createAlert(input: CreateTelegramAlertInput): Promise<TelegramAlert> {
    return this.db.telegramAlert.create({
      data: {
        telegramPreferenceId: input.telegramPreferenceId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        config: input.config,
        priority: input.priority || "MEDIUM",
      },
    });
  }

  async getAlert(id: string): Promise<TelegramAlert | null> {
    return this.db.telegramAlert.findUnique({
      where: { id },
    });
  }

  async listAlerts(
    telegramPreferenceId: string,
    filter?: TelegramAlertFilter
  ): Promise<TelegramAlert[]> {
    return this.db.telegramAlert.findMany({
      where: {
        telegramPreferenceId,
        enabled: filter?.enabled,
        priority: filter?.priority,
        triggerType: filter?.triggerType,
      },
    });
  }

  async updateAlert(
    id: string,
    input: UpdateTelegramAlertInput
  ): Promise<TelegramAlert> {
    return this.db.telegramAlert.update({
      where: { id },
      data: input,
    });
  }

  async deleteAlert(id: string): Promise<void> {
    await this.db.telegramAlert.delete({
      where: { id },
    });
  }

  async toggleAlert(id: string, enabled: boolean): Promise<TelegramAlert> {
    return this.db.telegramAlert.update({
      where: { id },
      data: { enabled },
    });
  }

  // ─────────────────────────────────────────────
  // Telegram Message operations
  // ─────────────────────────────────────────────

  async createMessage(input: CreateTelegramMessageInput): Promise<TelegramMessage> {
    return this.db.telegramMessage.create({
      data: {
        telegramPreferenceId: input.telegramPreferenceId,
        messageId: input.messageId,
        text: input.text,
        parseMode: input.parseMode || "HTML",
        status: "PENDING",
      },
    });
  }

  async getMessage(id: string): Promise<TelegramMessage | null> {
    return this.db.telegramMessage.findUnique({
      where: { id },
    });
  }

  async getMessageByTelegramId(messageId: string): Promise<TelegramMessage | null> {
    return this.db.telegramMessage.findUnique({
      where: { messageId },
    });
  }

  async listMessages(
    telegramPreferenceId: string,
    filter?: TelegramMessageFilter
  ): Promise<TelegramMessage[]> {
    return this.db.telegramMessage.findMany({
      where: {
        telegramPreferenceId,
        status: filter?.status,
        sentAt: {
          ...(filter?.beforeDate && { lte: filter.beforeDate }),
          ...(filter?.afterDate && { gte: filter.afterDate }),
        },
      },
      orderBy: { sentAt: "desc" },
    });
  }

  async updateMessageStatus(
    id: string,
    status: string,
    error?: string
  ): Promise<TelegramMessage> {
    return this.db.telegramMessage.update({
      where: { id },
      data: {
        status,
        error,
      },
    });
  }

  async incrementRetryCount(id: string): Promise<TelegramMessage> {
    return this.db.telegramMessage.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
      },
    });
  }

  // ─────────────────────────────────────────────
  // Statistics & Cleanup
  // ─────────────────────────────────────────────

  async getPendingMessages(maxAge: number): Promise<TelegramMessage[]> {
    const cutoff = new Date(Date.now() - maxAge);
    return this.db.telegramMessage.findMany({
      where: {
        status: "PENDING",
        sentAt: { lte: cutoff },
        retryCount: { lt: 3 },
      },
      orderBy: { sentAt: "asc" },
    });
  }

  async getFailedMessages(
    telegramPreferenceId: string
  ): Promise<TelegramMessage[]> {
    return this.db.telegramMessage.findMany({
      where: {
        telegramPreferenceId,
        status: { in: ["FAILED", "BOUNCED"] },
      },
      orderBy: { sentAt: "desc" },
    });
  }

  async deleteOldMessages(beforeDate: Date): Promise<number> {
    const result = await this.db.telegramMessage.deleteMany({
      where: {
        sentAt: { lt: beforeDate },
        status: { in: ["SENT", "DELIVERED"] },
      },
    });
    return result.count;
  }
}
