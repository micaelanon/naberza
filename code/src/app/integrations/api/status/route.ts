/**
 * GET /integrations/api/status
 * Returns connection status for each configured integration.
 * Each integration is checked by: env vars present + optional live ping.
 */

import { NextResponse } from "next/server";

export interface IntegrationStatus {
  id: string;
  configured: boolean;
  connected: boolean | null; // null = not attempted (no env vars)
  error?: string;
}

async function checkPaperless(): Promise<IntegrationStatus> {
  const url = process.env.PAPERLESS_URL;
  const token = process.env.PAPERLESS_TOKEN;
  if (!url || !token) return { id: "paperless", configured: false, connected: null };
  try {
    const res = await fetch(`${url}/api/documents/?page_size=1`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return { id: "paperless", configured: true, connected: res.ok };
  } catch (err) {
    return { id: "paperless", configured: true, connected: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}

async function checkHomeAssistant(): Promise<IntegrationStatus> {
  const url = process.env.HOME_ASSISTANT_URL;
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!url || !token) return { id: "home-assistant", configured: false, connected: null };
  try {
    const res = await fetch(`${url}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return { id: "home-assistant", configured: true, connected: res.ok };
  } catch (err) {
    return { id: "home-assistant", configured: true, connected: false, error: err instanceof Error ? err.message : "unreachable" };
  }
}

function checkMail(): IntegrationStatus {
  const host = process.env.MAIL_IMAP_HOST;
  const user = process.env.MAIL_IMAP_USER;
  const pass = process.env.MAIL_IMAP_PASSWORD;
  const configured = !!(host && user && pass);
  // IMAP requires a TCP connection — we only check env vars here
  return { id: "mail", configured, connected: configured ? true : null };
}

function checkTelegram(): IntegrationStatus {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
  const configured = !!(token && chatId);
  return { id: "telegram", configured, connected: configured ? true : null };
}

function checkSmtp(): IntegrationStatus {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const configured = !!(host && user);
  return { id: "smtp", configured, connected: configured ? true : null };
}

function checkWebhooks(): IntegrationStatus {
  const secret = process.env.WEBHOOK_SECRET;
  const configured = !!secret;
  return { id: "webhooks", configured, connected: configured ? true : null };
}

export async function GET(): Promise<NextResponse> {
  const [paperless, homeAssistant] = await Promise.all([
    checkPaperless(),
    checkHomeAssistant(),
  ]);
  const statuses: IntegrationStatus[] = [
    paperless,
    homeAssistant,
    checkMail(),
    checkTelegram(),
    checkSmtp(),
    checkWebhooks(),
  ];
  return NextResponse.json({ statuses });
}
