import type { Document, DocumentType } from "@prisma/client";

export type { DocumentType };

// Re-export Prisma model as canonical domain type
export type { Document };

// ─── Input types ────────────────────────────────────────────────

export interface CreateDocumentInput {
  title: string;
  externalId: string;
  externalUrl?: string;
  sourceConnectionId: string;
  documentType?: DocumentType;
  correspondent?: string;
  tags?: string[];
  contentPreview?: string;
  inboxItemId?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  externalUrl?: string;
  documentType?: DocumentType;
  correspondent?: string;
  tags?: string[];
  contentPreview?: string;
  archivedAt?: Date | null;
}

export interface ListDocumentsOptions {
  type?: DocumentType;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── View types ─────────────────────────────────────────────────

export interface DocumentSummary {
  id: string;
  title: string;
  documentType: DocumentType;
  correspondent: string | null;
  tags: string[];
  externalUrl: string | null;
  createdAt: Date;
}
