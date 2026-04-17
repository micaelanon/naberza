import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

const mockEnv = vi.hoisted(() => ({
  telegramBotToken: "test-bot-token",
  telegramDefaultChatId: "test-chat-id",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFromAddress: "naberza@localhost",
  smtpDefaultTo: "",
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { TelegramNotificationChannel } from "../telegram.adapter";
import type { NotificationPayload } from "@/modules/automations/notification.types";

const payload: NotificationPayload = {
  subject: "Test subject",
  body: "Test body",
  level: "info",
};

function makeOkResponse(messageId = 42) {
  return {
    ok: true,
    json: () => Promise.resolve({ ok: true, result: { message_id: messageId } }),
  };
}

function makeErrorResponse(description = "Bad request") {
  return {
    ok: false,
    json: () => Promise.resolve({ ok: false, description }),
  };
}

describe("TelegramNotificationChannel", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends message and returns success", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(99));
    const channel = new TelegramNotificationChannel();
    const result = await channel.send(payload);
    expect(result).toMatchObject({ channelId: "telegram", success: true, messageId: "99" });
  });

  it("calls Telegram API with correct URL and method", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse());
    const channel = new TelegramNotificationChannel();
    await channel.send(payload);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api.telegram.org");
    expect(url).toContain("test-bot-token");
    expect(opts.method).toBe("POST");
  });

  it("includes level emoji and HTML in message text", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse());
    const channel = new TelegramNotificationChannel();
    await channel.send({ ...payload, level: "critical" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { text: string };
    expect(body.text).toContain("🚨");
  });

  it("returns failure when Telegram API responds ok=false", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse("Unauthorized"));
    const channel = new TelegramNotificationChannel();
    const result = await channel.send(payload);
    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
  });

  it("returns failure when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const channel = new TelegramNotificationChannel();
    const result = await channel.send(payload);
    expect(result).toMatchObject({ success: false, error: "Network error" });
  });

  it("returns failure when bot token is missing", async () => {
    const channel = new TelegramNotificationChannel({ botToken: "", chatId: "chat" });
    const result = await channel.send(payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not configured");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns failure when chat id is missing", async () => {
    const channel = new TelegramNotificationChannel({ botToken: "token", chatId: "" });
    const result = await channel.send(payload);
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts config override over env defaults", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse());
    const channel = new TelegramNotificationChannel({ botToken: "custom-token", chatId: "custom-chat" });
    await channel.send(payload);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("custom-token");
  });

  it("has id=telegram and name=Telegram", () => {
    const channel = new TelegramNotificationChannel();
    expect(channel.id).toBe("telegram");
    expect(channel.name).toBe("Telegram");
  });
});
