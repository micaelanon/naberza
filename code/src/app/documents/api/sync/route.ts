import { NextResponse } from "next/server";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { DocumentService } from "@/modules/documents/document.service";
import type { CreateDocumentInput } from "@/modules/documents";

const repository = new DocumentRepository();
const service = new DocumentService(repository);

type SyncBody = Record<string, unknown>;

function requiredString(input: SyncBody, key: string): string | null {
  const v = input[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function buildPayload(input: SyncBody): CreateDocumentInput {
  return {
    title: requiredString(input, "title") as string,
    externalId: requiredString(input, "externalId") as string,
    sourceConnectionId: requiredString(input, "sourceConnectionId") as string,
    externalUrl: typeof input.externalUrl === "string" ? input.externalUrl : undefined,
    correspondent: typeof input.correspondent === "string" ? input.correspondent : undefined,
    contentPreview: typeof input.contentPreview === "string" ? input.contentPreview : undefined,
    tags: Array.isArray(input.tags)
      ? (input.tags as string[]).filter((t) => typeof t === "string")
      : [],
    inboxItemId: typeof input.inboxItemId === "string" ? input.inboxItemId : undefined,
  };
}

function validateSyncBody(
  input: SyncBody,
): { valid: true; payload: CreateDocumentInput } | { valid: false; error: string } {
  if (!requiredString(input, "title")) return { valid: false, error: "title is required" };
  if (!requiredString(input, "externalId")) return { valid: false, error: "externalId is required" };
  if (!requiredString(input, "sourceConnectionId"))
    return { valid: false, error: "sourceConnectionId is required" };
  return { valid: true, payload: buildPayload(input) };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await (request as Request & { json(): Promise<unknown> }).json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateSyncBody(body as SyncBody);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await service.upsertFromPaperless(validation.payload);
    const status = result.created ? 201 : 200;
    return NextResponse.json({ data: result.document, created: result.created }, { status });
  } catch (error) {
    console.error("[Documents API] POST /documents/api/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
