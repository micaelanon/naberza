import { MessageStatus, Prisma } from "@prisma/client";
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
  private readonly db = prisma;

  private asJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  async createPreference(input: CreateTelegramPreferenceInput): Promise<TelegramPreference> {
    return this.db.telegramPreference.create({
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

  async createAlert(input: CreateTelegramAlertInput): Promise<TelegramAlert> {
    return this.db.telegramAlert.create({
      data: {
        telegramPreferenceId: input.telegramPreferenceId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType as never,
        config: this.asJson(input.config),
        priority: input.priority || "MEDIUM",
      },
    }) as unknown as TelegramAlert;
  }

  async getAlert(id: string): Promise<TelegramAlert | null> {
    return this.db.telegramAlert.findUnique({
      where: { id },
    }) as unknown as TelegramAlert | null;
  }

  async listAlerts(
    telegramPreferenceId: string,
    filter?: TelegramAlertFilter
  ): Promise<TelegramAlert[]> {
    return this.db.telegramAlert.findMany({
      where: {
        telegramPreferenceId,
        ...(filter?.enabled !== undefined && { enabled: filter.enabled }),
        ...(filter?.priority !== undefined && { priority: filter.priority }),
        ...(filter?.triggerType !== undefined && { triggerType: filter.triggerType as never }),
      },
    }) as unknown as TelegramAlert[];
  }

  async updateAlert(
    id: string,
    input: UpdateTelegramAlertInput
  ): Promise<TelegramAlert> {
    return this.db.telegramAlert.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.config !== undefined && { config: this.asJson(input.config) }),
      },
    }) as unknown as TelegramAlert;
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
    }) as unknown as TelegramAlert;
  }

  async createMessage(input: CreateTelegramMessageInput): Promise<TelegramMessage> {
    return this.db.telegramMessage.create({
      data: {
        telegramPreferenceId: input.telegramPreferenceId,
        messageId: input.messageId,
        text: input.text,
        parseMode: input.parseMode || "HTML",
        status: MessageStatus.PENDING,
      },
    }) as unknown as TelegramMessage;
  }

  async getMessage(id: string): Promise<TelegramMessage | null> {
    return this.db.telegramMessage.findUnique({
      where: { id },
    }) as unknown as TelegramMessage | null;
  }

  async getMessageByTelegramId(messageId: string): Promise<TelegramMessage | null> {
    return this.db.telegramMessage.findUnique({
      where: { messageId },
    }) as unknown as TelegramMessage | null;
  }

  async listMessages(
    telegramPreferenceId: string,
    filter?: TelegramMessageFilter
  ): Promise<TelegramMessage[]> {
    return this.db.telegramMessage.findMany({
      where: {
        telegramPreferenceId,
        ...(filter?.status !== undefined && { status: filter.status as never }),
        sentAt: {
          ...(filter?.beforeDate && { lte: filter.beforeDate }),
          ...(filter?.afterDate && { gte: filter.afterDate }),
        },
      },
      orderBy: { sentAt: "desc" },
    }) as unknown as TelegramMessage[];
  }

  async updateMessageStatus(
    id: string,
    status: MessageStatus,
    error?: string
  ): Promise<TelegramMessage> {
    return this.db.telegramMessage.update({
      where: { id },
      data: {
        status,
        error,
      },
    }) as unknown as TelegramMessage;
  }

  async incrementRetryCount(id: string): Promise<TelegramMessage> {
    return this.db.telegramMessage.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
      },
    }) as unknown as TelegramMessage;
  }

  async getPendingMessages(maxAge: number): Promise<TelegramMessage[]> {
    const cutoff = new Date(Date.now() - maxAge);
    return this.db.telegramMessage.findMany({
      where: {
        status: MessageStatus.PENDING,
        sentAt: { lte: cutoff },
        retryCount: { lt: 3 },
      },
      orderBy: { sentAt: "asc" },
    }) as unknown as TelegramMessage[];
  }

  async getFailedMessages(telegramPreferenceId: string): Promise<TelegramMessage[]> {
    return this.db.telegramMessage.findMany({
      where: {
        telegramPreferenceId,
        status: { in: [MessageStatus.FAILED, MessageStatus.BOUNCED] },
      },
      orderBy: { sentAt: "desc" },
    }) as unknown as TelegramMessage[];
  }

  async deleteOldMessages(beforeDate: Date): Promise<number> {
    const result = await this.db.telegramMessage.deleteMany({
      where: {
        sentAt: { lt: beforeDate },
        status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
      },
    });
    return result.count;
  }
}
