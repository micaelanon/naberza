import { env } from "@/lib/env";
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from "@/modules/automations/notification.types";

// ─── Message formatter ────────────────────────────────────────────────────────

function buildTelegramText(payload: NotificationPayload): string {
  const levelEmoji = { info: "ℹ️", warning: "⚠️", critical: "🚨" }[payload.level];
  return `${levelEmoji} <b>${escapeHtml(payload.subject)}</b>\n\n${escapeHtml(payload.body)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Telegram API ─────────────────────────────────────────────────────────────

interface TelegramApiResponse {
  ok: boolean;
  result?: { message_id?: number };
  description?: string;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramApiResponse> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return response.json() as Promise<TelegramApiResponse>;
}

// ─── TelegramNotificationChannel ─────────────────────────────────────────────

export interface TelegramChannelConfig {
  botToken?: string;
  chatId?: string;
}

export class TelegramNotificationChannel implements NotificationChannel {
  readonly id = "telegram";
  readonly name = "Telegram";

  private readonly botToken: string;
  private readonly chatId: string;

  constructor(config: TelegramChannelConfig = {}) {
    this.botToken = config.botToken ?? env.telegramBotToken ?? "";
    this.chatId = config.chatId ?? env.telegramDefaultChatId ?? "";
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.botToken || !this.chatId) {
      return {
        channelId: this.id,
        success: false,
        error: "Telegram not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_DEFAULT_CHAT_ID",
      };
    }

    try {
      const text = buildTelegramText(payload);
      const apiResponse = await sendTelegramMessage(this.botToken, this.chatId, text);

      if (!apiResponse.ok) {
        return {
          channelId: this.id,
          success: false,
          error: apiResponse.description ?? "Telegram API returned ok=false",
        };
      }

      return {
        channelId: this.id,
        success: true,
        messageId: String(apiResponse.result?.message_id ?? ""),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { channelId: this.id, success: false, error: message };
    }
  }
}
