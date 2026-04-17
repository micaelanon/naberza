import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";
import type { EventActor } from "@/lib/events";
import type { InboxClassification } from "@/modules/inbox/inbox.types";
import type { MailImapAdapter, EmailMessage } from "./mail-imap.adapter";

const SYSTEM_ACTOR: EventActor = { type: "system" };

export interface MailSyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

function buildTitle(message: EmailMessage): string {
  return message.subject || `Email from ${message.from}`;
}

function buildBody(message: EmailMessage): string {
  const parts: string[] = [];
  parts.push(`From: ${message.from}`);
  if (message.to.length > 0) parts.push(`To: ${message.to.join(", ")}`);
  parts.push(`Date: ${message.date.toISOString()}`);
  if (message.attachments.length > 0) {
    const names = message.attachments.map((a) => a.filename).join(", ");
    parts.push(`Attachments: ${names}`);
  }
  if (message.body) parts.push(`\n${message.body}`);
  return parts.join("\n");
}

function detectClassification(message: EmailMessage): InboxClassification {
  const subject = message.subject.toLowerCase();
  const hasInvoiceKeyword =
    subject.includes("invoice") ||
    subject.includes("factura") ||
    subject.includes("receipt") ||
    subject.includes("recibo");
  const hasPdfAttachment = message.attachments.some(
    (a) => a.mimeType === "application/pdf" || a.filename.endsWith(".pdf")
  );
  if (hasInvoiceKeyword || hasPdfAttachment) return "INVOICE";
  if (message.attachments.length > 0) return "DOCUMENT";
  return "REVIEW";
}

async function findExistingItem(externalId: string, connectionId: string): Promise<boolean> {
  const existing = await prisma.inboxItem.findFirst({
    where: { sourceExternalId: externalId, sourceConnectionId: connectionId },
    select: { id: true },
  });
  return existing !== null;
}

async function createInboxItem(
  message: EmailMessage,
  connectionId: string
): Promise<void> {
  const classification = detectClassification(message);

  const item = await prisma.inboxItem.create({
    data: {
      title: buildTitle(message),
      body: buildBody(message),
      sourceType: "EMAIL",
      sourceConnectionId: connectionId,
      sourceExternalId: message.messageId,
      sourceRawPayload: message as never,
      status: "PENDING",
      classification,
      classifiedBy: "RULE",
      classificationConfidence: classification === "REVIEW" ? 0.7 : 0.85,
    },
  });

  await eventBus.emit("inbox.item.created", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "EMAIL",
  });

  await eventBus.emit("inbox.item.classified", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "EMAIL",
    classification,
    classifiedBy: "rule",
    confidence: classification === "REVIEW" ? 0.7 : 0.85,
  });
}

async function processMessage(
  message: EmailMessage,
  connectionId: string,
  result: MailSyncResult
): Promise<void> {
  try {
    const exists = await findExistingItem(message.messageId, connectionId);
    if (exists) {
      result.skipped++;
      return;
    }
    await createInboxItem(message, connectionId);
    result.synced++;
  } catch {
    result.errors++;
  }
}

export async function syncMailMessages(
  adapter: MailImapAdapter,
  options: { since?: Date; markAsRead?: boolean } = {}
): Promise<MailSyncResult> {
  const result: MailSyncResult = { synced: 0, skipped: 0, errors: 0 };

  const messages = await adapter.fetchNewMessages(options.since);

  for (const message of messages) {
    await processMessage(message, adapter.connectionId, result);
    if (options.markAsRead && message.uid > 0) {
      await adapter.markAsRead(message.uid).catch(() => undefined);
    }
  }

  return result;
}
