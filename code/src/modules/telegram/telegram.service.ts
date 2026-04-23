import { eventBus } from "@/lib/events/event-bus";
import { AuditService } from "@/lib/audit";
import { TelegramRepository } from "./telegram.repository";
import {
  TelegramPreference,
  TelegramAlert,
  TelegramMessage,
  CreateTelegramAlertInput,
  UpdateTelegramAlertInput,
  TelegramAlertFilter,
  TelegramMessageFilter,
  SendAlertResult,
  AlertTriggerType,
  MessageStatus,
} from "./telegram.types";

export class TelegramService {
  constructor(
    private repository: TelegramRepository,
    private auditService: AuditService
  ) {}

  // ─────────────────────────────────────────────
  // Preference Management
  // ─────────────────────────────────────────────

  async registerUser(userId: string): Promise<TelegramPreference> {
    const existing = await this.repository.getPreferenceByUserId(userId);
    if (existing) {
      return existing;
    }

    const preference = await this.repository.createPreference({
      userId,
    });

    await this.auditService.log({
      module: "telegram",
      action: "register",
      entityType: "TelegramPreference",
      entityId: preference.id,
      actor: "user",
      actorDetail: userId,
      status: "success",
      output: { preferenceId: preference.id },
    });

    eventBus.emit("notification.telegram.registered", {
      userId,
      preferenceId: preference.id,
    });

    return preference;
  }

  async getPreference(userId: string): Promise<TelegramPreference | null> {
    return this.repository.getPreferenceByUserId(userId);
  }

  async verifyTelegramUser(
    userId: string,
    telegramUserId: number,
    telegramUsername?: string
  ): Promise<TelegramPreference> {
    const preference = await this.repository.getPreferenceByUserId(userId);
    if (!preference) {
      throw new Error("Telegram preference not found for user");
    }

    const updated = await this.repository.updatePreference(preference.id, {
      telegramUserId,
      telegramUsername,
      telegramEnabled: true,
      verificationCode: null,
      verificationExpires: null,
    });

    await this.auditService.log({
      module: "telegram",
      action: "verify",
      entityType: "TelegramPreference",
      entityId: preference.id,
      actor: "user",
      actorDetail: userId,
      status: "success",
      output: { telegramUserId, telegramUsername },
    });

    eventBus.emit("notification.telegram.verified", {
      userId,
      telegramUserId,
      preferenceId: preference.id,
    });

    return updated;
  }

  // ─────────────────────────────────────────────
  // Alert Management
  // ─────────────────────────────────────────────

  async createAlert(input: CreateTelegramAlertInput): Promise<TelegramAlert> {
    const alert = await this.repository.createAlert(input);

    await this.auditService.log({
      module: "telegram",
      action: "alert.created",
      entityType: "TelegramAlert",
      entityId: alert.id,
      actor: "user",
      status: "success",
      input: { name: input.name, triggerType: input.triggerType },
      output: { alertId: alert.id },
    });

    eventBus.emit("notification.telegram.alert.created", {
      alertId: alert.id,
      triggerType: input.triggerType,
    });

    return alert;
  }

  async getAlert(id: string): Promise<TelegramAlert | null> {
    return this.repository.getAlert(id);
  }

  async listAlerts(
    telegramPreferenceId: string,
    filter?: TelegramAlertFilter
  ): Promise<TelegramAlert[]> {
    return this.repository.listAlerts(telegramPreferenceId, filter);
  }

  async updateAlert(id: string, input: UpdateTelegramAlertInput): Promise<TelegramAlert> {
    const alert = await this.repository.updateAlert(id, input);

    await this.auditService.log({
      module: "telegram",
      action: "alert.updated",
      entityType: "TelegramAlert",
      entityId: id,
      actor: "user",
      status: "success",
      input: input as Record<string, unknown>,
      output: { alertId: id },
    });

    eventBus.emit("notification.telegram.alert.updated", {
      alertId: id,
      changes: input as Record<string, unknown>,
    });

    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    const alert = await this.repository.getAlert(id);
    if (!alert) {
      throw new Error("Alert not found");
    }

    await this.repository.deleteAlert(id);

    await this.auditService.log({
      module: "telegram",
      action: "alert.deleted",
      entityType: "TelegramAlert",
      entityId: id,
      actor: "user",
      status: "success",
    });

    eventBus.emit("notification.telegram.alert.deleted", {
      alertId: id,
    });
  }

  async toggleAlert(id: string, enabled: boolean): Promise<TelegramAlert> {
    const alert = await this.repository.toggleAlert(id, enabled);

    await this.auditService.log({
      module: "telegram",
      action: `alert.${enabled ? "enabled" : "disabled"}`,
      entityType: "TelegramAlert",
      entityId: id,
      actor: "user",
      status: "success",
    });

    return alert;
  }

  // ─────────────────────────────────────────────
  // Message Management & Sending
  // ─────────────────────────────────────────────

  async sendMessage(
    telegramPreferenceId: string,
    text: string,
    messageId?: string
  ): Promise<SendAlertResult> {
    const preference = await this.repository.getPreferenceByUserId(
      await this.getPreferenceUserId(telegramPreferenceId)
    );

    if (!preference || !preference.telegramEnabled || !preference.telegramUserId) {
      return {
        messageId: messageId || `msg-${Date.now()}`,
        status: MessageStatus.FAILED,
        error: "Telegram not enabled for user",
      };
    }

    const message = await this.repository.createMessage({
      telegramPreferenceId,
      messageId: messageId || `msg-${Date.now()}`,
      text,
      parseMode: "HTML",
    });

    try {
      // TODO: Integrate with actual Telegram Bot API
      // const result = await telegramAdapter.sendMessage(preference.telegramUserId, text);
      // await this.repository.updateMessageStatus(message.id, "SENT");

      // For now, mark as sent immediately for development
      await this.repository.updateMessageStatus(message.id, MessageStatus.SENT);

      await this.auditService.log({
        module: "telegram",
        action: "message.sent",
        entityType: "TelegramMessage",
        entityId: message.id,
        actor: "system",
        status: "success",
      });

      eventBus.emit("notification.telegram.sent", {
        messageId: message.id,
        telegramUserId: preference.telegramUserId,
      });

      return {
        messageId: message.id,
        status: MessageStatus.SENT,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      await this.repository.updateMessageStatus(message.id, MessageStatus.FAILED, errorMsg);

      await this.auditService.log({
        module: "telegram",
        action: "message.failed",
        entityType: "TelegramMessage",
        entityId: message.id,
        actor: "system",
        status: "failure",
        errorMessage: errorMsg,
      });

      eventBus.emit("notification.telegram.failed", {
        messageId: message.id,
        error: errorMsg,
      });

      return {
        messageId: message.id,
        status: MessageStatus.FAILED,
        error: errorMsg,
      };
    }
  }

  async retryFailedMessages(maxRetries: number = 3): Promise<number> {
    const pendingMessages = await this.repository.getPendingMessages(
      30 * 60 * 1000 // 30 minutes
    );

    let retried = 0;
    for (const msg of pendingMessages) {
      if (msg.retryCount < maxRetries) {
        await this.repository.incrementRetryCount(msg.id);
        // TODO: Retry sending via Telegram adapter
        retried++;
      }
    }

    return retried;
  }

  async listMessages(
    telegramPreferenceId: string,
    filter?: TelegramMessageFilter
  ): Promise<TelegramMessage[]> {
    return this.repository.listMessages(telegramPreferenceId, filter);
  }

  async deleteOldMessages(daysOld: number = 30): Promise<number> {
    const beforeDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.repository.deleteOldMessages(beforeDate);
  }

  // ─────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────

  private async getPreferenceUserId(telegramPreferenceId: string): Promise<string> {
    // This would need to be added to the repository
    // For now, we'll work with the ID directly
    return telegramPreferenceId;
  }

  /**
   * Check if user has enabled Telegram and active alerts for a trigger type
   */
  async hasEnabledAlerts(
    userId: string,
    triggerType?: AlertTriggerType
  ): Promise<boolean> {
    const preference = await this.repository.getPreferenceByUserId(userId);
    if (!preference || !preference.telegramEnabled) {
      return false;
    }

    const alerts = await this.repository.listAlerts(preference.id, {
      enabled: true,
      ...(triggerType && { triggerType }),
    });

    return alerts.length > 0;
  }

  /**
   * Get all enabled alerts for a user that match a trigger type
   */
  async getEnabledAlertsForTrigger(
    userId: string,
    triggerType: AlertTriggerType
  ): Promise<TelegramAlert[]> {
    const preference = await this.repository.getPreferenceByUserId(userId);
    if (!preference) {
      return [];
    }

    return this.repository.listAlerts(preference.id, {
      enabled: true,
      triggerType,
    });
  }
}
