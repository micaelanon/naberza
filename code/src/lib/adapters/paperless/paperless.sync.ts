import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";
import type { EventActor } from "@/lib/events";
import type { PaperlessAdapter, PaperlessDocument } from "./paperless.adapter";

const SYSTEM_ACTOR: EventActor = { type: "system" };

export interface PaperlessSyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

function buildTitle(doc: PaperlessDocument): string {
  return doc.title || doc.original_file_name || `Document #${doc.id}`;
}

function buildBody(doc: PaperlessDocument, adapter: PaperlessAdapter): string {
  const parts: string[] = [];
  if (doc.content) parts.push(doc.content.slice(0, 500));
  parts.push(`\nDescarga: ${adapter.getDownloadUrl(doc)}`);
  return parts.join("\n").trim();
}

async function findExistingItem(externalId: string, connectionId: string): Promise<boolean> {
  const existing = await prisma.inboxItem.findFirst({
    where: { sourceExternalId: externalId, sourceConnectionId: connectionId },
    select: { id: true },
  });
  return existing !== null;
}

async function createInboxItem(
  doc: PaperlessDocument,
  adapter: PaperlessAdapter,
  connectionId: string
): Promise<void> {
  const item = await prisma.inboxItem.create({
    data: {
      title: buildTitle(doc),
      body: buildBody(doc, adapter),
      sourceType: "PAPERLESS",
      sourceConnectionId: connectionId,
      sourceExternalId: String(doc.id),
      sourceRawPayload: doc as never,
      status: "PENDING",
      classification: "DOCUMENT",
      classifiedBy: "RULE",
      classificationConfidence: 0.9,
    },
  });

  await eventBus.emit("inbox.item.created", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "PAPERLESS",
  });

  await eventBus.emit("inbox.item.classified", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "PAPERLESS",
    classification: "DOCUMENT",
    classifiedBy: "rule",
    confidence: 0.9,
  });
}

async function processSyncDoc(
  doc: PaperlessDocument,
  adapter: PaperlessAdapter,
  result: PaperlessSyncResult
): Promise<void> {
  try {
    const exists = await findExistingItem(String(doc.id), adapter.connectionId);
    if (exists) {
      result.skipped++;
      return;
    }
    await createInboxItem(doc, adapter, adapter.connectionId);
    result.synced++;
  } catch {
    result.errors++;
  }
}

export async function syncPaperlessDocuments(
  adapter: PaperlessAdapter,
  options: { pageSize?: number; maxPages?: number } = {}
): Promise<PaperlessSyncResult> {
  const { pageSize = 25, maxPages = 10 } = options;
  const result: PaperlessSyncResult = { synced: 0, skipped: 0, errors: 0 };

  for (let page = 1; page <= maxPages; page++) {
    const response = await adapter.getDocuments({ page, pageSize, ordering: "-added" });
    for (const doc of response.results) {
      await processSyncDoc(doc, adapter, result);
    }
    if (!response.next) break;
  }

  return result;
}
