import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { DocumentService } from "@/modules/documents/document.service";
import type { DocumentType } from "@/modules/documents";

const repository = new DocumentRepository();
const service = new DocumentService(repository);

const VALID_DOCUMENT_TYPES = new Set<DocumentType>([
  "INVOICE",
  "CONTRACT",
  "RECEIPT",
  "LETTER",
  "CERTIFICATE",
  "OTHER",
]);

function parseDocumentType(raw: string | null): DocumentType | undefined {
  if (raw && VALID_DOCUMENT_TYPES.has(raw as DocumentType)) return raw as DocumentType;
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = parseDocumentType(searchParams.get("type"));
  const search = searchParams.get("search") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listDocuments({ type, search, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Documents API] GET /documents/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
