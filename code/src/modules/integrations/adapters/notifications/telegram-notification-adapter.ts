/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConnectionType, HealthCheckResult } from "../../providers";

import { NotImplementedError } from "../not-implemented-error";
import type {
  NotificationProvider,
  NotificationProviderCapabilities,
  Notification,
  NotificationResult,
} from "../../providers";

/**
 * Telegram notification provider stub.
 *
 * Auth: Bot token via TELEGRAM_BOT_TOKEN env var
 * Supports: rich text (Markdown), inline action buttons
 *
 * Implementation target: Phase 7
 * Reference: docs/integrations.md — NotificationProvider
 */
export class TelegramNotificationAdapter implements NotificationProvider {
  readonly type: ConnectionType = "API";
  readonly connectionId: string;

  readonly capabilities: NotificationProviderCapabilities = {
    supportsRichText: true,
    supportsAttachments: true,
    supportsActions: true,
    maxMessageLength: 4096,
  };

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  async send(_notification: Notification): Promise<NotificationResult> {
    throw new NotImplementedError("TelegramNotificationAdapter", "send");
  }

  async testConnection(): Promise<HealthCheckResult> {
    return {
      healthy: false,
      latencyMs: 0,
      message: "TelegramNotificationAdapter not yet implemented (Phase 7)",
      checkedAt: new Date(),
    };
  }
}
