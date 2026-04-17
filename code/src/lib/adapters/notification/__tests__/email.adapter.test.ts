import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "smtp-msg-001" }));
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })));

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));

const mockEnv = vi.hoisted(() => ({
  smtpHost: "smtp.test.local",
  smtpPort: 587,
  smtpUser: "user@test.local",
  smtpPassword: "secret",
  smtpFromAddress: "naberza@test.local",
  smtpDefaultTo: "admin@test.local",
  telegramBotToken: "",
  telegramDefaultChatId: "",
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { EmailNotificationChannel } from "../email.adapter";
import type { NotificationPayload } from "@/modules/automations/notification.types";

const payload: NotificationPayload = {
  subject: "Invoice due",
  body: "Invoice #123 is overdue.",
  level: "warning",
};

describe("EmailNotificationChannel", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends email and returns success", async () => {
    const channel = new EmailNotificationChannel();
    const result = await channel.send(payload);
    expect(result).toMatchObject({ channelId: "email", success: true, messageId: "smtp-msg-001" });
  });

  it("calls createTransport with correct SMTP config", async () => {
    const channel = new EmailNotificationChannel();
    await channel.send(payload);
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.test.local",
      port: 587,
      auth: { user: "user@test.local", pass: "secret" },
    });
  });

  it("calls sendMail with subject and to address", async () => {
    const channel = new EmailNotificationChannel();
    await channel.send(payload);
    expect(mockSendMail).toHaveBeenCalledOnce();
    const mail = mockSendMail.mock.calls[0][0] as { subject: string; to: string };
    expect(mail.subject).toBe("Invoice due");
    expect(mail.to).toBe("admin@test.local");
  });

  it("includes html body in the email", async () => {
    const channel = new EmailNotificationChannel();
    await channel.send(payload);
    const mail = mockSendMail.mock.calls[0][0] as { html: string };
    expect(mail.html).toContain("Invoice due");
  });

  it("returns failure when SMTP not configured", async () => {
    const channel = new EmailNotificationChannel({ smtpHost: "" });
    const result = await channel.send(payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not configured");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns failure when toAddress is missing", async () => {
    const channel = new EmailNotificationChannel({ toAddress: "" });
    const result = await channel.send(payload);
    expect(result.success).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("returns failure when sendMail throws", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));
    const channel = new EmailNotificationChannel();
    const result = await channel.send(payload);
    expect(result).toMatchObject({ success: false, error: "SMTP connection refused" });
  });

  it("accepts config override over env defaults", async () => {
    const channel = new EmailNotificationChannel({
      toAddress: "custom@test.local",
      fromAddress: "from@test.local",
    });
    await channel.send(payload);
    const mail = mockSendMail.mock.calls[0][0] as { to: string; from: string };
    expect(mail.to).toBe("custom@test.local");
    expect(mail.from).toBe("from@test.local");
  });

  it("has id=email and name=Email", () => {
    const channel = new EmailNotificationChannel();
    expect(channel.id).toBe("email");
    expect(channel.name).toBe("Email");
  });
});
