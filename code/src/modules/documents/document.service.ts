import { eventBus } from "@/lib/events";
import type { DocumentRepository } from "./document.repository";
import type {
  Document,
  DocumentSummary,
  ListDocumentsOptions,
  CreateDocumentInput,
} from "./document.types";

export class DocumentService {
  constructor(private readonly repository: DocumentRepository) {}

  async getDocument(id: string): Promise<Document | null> {
    return this.repository.findById(id);
  }

  async listDocuments(options: ListDocumentsOptions = {}): Promise<{
    items: DocumentSummary[];
    total: number;
  }> {
    const [docs, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count({ type: options.type, search: options.search }),
    ]);

    const items: DocumentSummary[] = docs.map((d) => ({
      id: d.id,
      title: d.title,
      documentType: d.documentType,
      correspondent: d.correspondent,
      tags: d.tags,
      externalUrl: d.externalUrl,
      createdAt: d.createdAt,
    }));

    return { items, total };
  }

  async upsertFromPaperless(input: CreateDocumentInput): Promise<{
    document: Document;
    created: boolean;
  }> {
    const result = await this.repository.upsert(
      input.sourceConnectionId,
      input.externalId,
      input,
    );

    if (result.created) {
      await eventBus.emit("document.created", {
        documentId: result.document.id,
        sourceConnectionId: input.sourceConnectionId,
        externalId: input.externalId,
        timestamp: new Date(),
        actor: { type: "system" },
      });
    } else {
      await eventBus.emit("document.updated", {
        documentId: result.document.id,
        sourceConnectionId: input.sourceConnectionId,
        timestamp: new Date(),
        actor: { type: "system" },
      });
    }

    return result;
  }

  async syncCount(): Promise<number> {
    return this.repository.count();
  }
}
