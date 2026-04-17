import { env } from "@/lib/env";
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from "@/modules/automations/notification.types";

// ─── Message formatters ───────────────────────────────────────────────────────

function buildTextBody(payload: NotificationPayload): string {
  return `${payload.subject}\n\n${payload.body}`;
}

function buildHtmlBody(payload: NotificationPayload): string {
  const levelLabel = { info: "Info", warning: "Warning", critical: "Critical" }[payload.level];
  return `
<div style="font-family:sans-serif;max-width:600px">
  <h2 style="margin:0 0 .5rem">${payload.subject}</h2>
  <p style="margin:0 0 1rem;color:#555">${payload.body.replace(/\n/g, "<br>")}</p>
  <p style="margin:0;font-size:.8rem;color:#888">Level: ${levelLabel}</p>
</div>`.trim();
}

// ─── SMTP transport ───────────────────────────────────────────────────────────

interface SmtpSendParams {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}

async function sendViaNativeSmtp(params: SmtpSendParams): Promise<{ messageId: string }> {
  // Lazy import — nodemailer is an optional peer dep; fail gracefully if absent.
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: params.host,
    port: params.port,
    auth: { user: params.user, pass: params.password },
  });
  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.textBody,
    html: params.htmlBody,
  });
  return { messageId: String(info.messageId ?? "") };
}

// ─── EmailNotificationChannel ─────────────────────────────────────────────────

export interface EmailChannelConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromAddress?: string;
  toAddress?: string;
}

function resolveSmtpConfig(config: EmailChannelConfig) {
  return {
    smtpHost: config.smtpHost ?? env.smtpHost ?? "",
    smtpPort: config.smtpPort ?? env.smtpPort,
    smtpUser: config.smtpUser ?? env.smtpUser ?? "",
    smtpPassword: config.smtpPassword ?? env.smtpPassword ?? "",
  };
}

function resolveAddressConfig(config: EmailChannelConfig) {
  return {
    fromAddress: config.fromAddress ?? env.smtpFromAddress,
    toAddress: config.toAddress ?? env.smtpDefaultTo ?? "",
  };
}

function resolveEmailConfig(config: EmailChannelConfig): Required<EmailChannelConfig> {
  return { ...resolveSmtpConfig(config), ...resolveAddressConfig(config) };
}

export class EmailNotificationChannel implements NotificationChannel {
  readonly id = "email";
  readonly name = "Email";

  private readonly config: Required<EmailChannelConfig>;

  constructor(config: EmailChannelConfig = {}) {
    this.config = resolveEmailConfig(config);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const { smtpHost, smtpUser, smtpPassword, toAddress } = this.config;

    if (!smtpHost || !smtpUser || !smtpPassword || !toAddress) {
      return {
        channelId: this.id,
        success: false,
        error: "Email not configured: missing SMTP_HOST, SMTP_USER, SMTP_PASSWORD, or SMTP_DEFAULT_TO",
      };
    }

    try {
      const result = await sendViaNativeSmtp({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        user: this.config.smtpUser,
        password: this.config.smtpPassword,
        from: this.config.fromAddress,
        to: this.config.toAddress,
        subject: payload.subject,
        textBody: buildTextBody(payload),
        htmlBody: buildHtmlBody(payload),
      });

      return { channelId: this.id, success: true, messageId: result.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { channelId: this.id, success: false, error: message };
    }
  }
}
