import { prisma } from "@/lib/db";
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  ListDocumentsOptions,
  Document,
} from "./document.types";

export class DocumentRepository {
  async findById(id: string): Promise<Document | null> {
    return prisma.document.findUnique({ where: { id } });
  }

  async findByExternalId(sourceConnectionId: string, externalId: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { sourceConnectionId_externalId: { sourceConnectionId, externalId } },
    });
  }

  async list(options: ListDocumentsOptions = {}): Promise<Document[]> {
    return prisma.document.findMany({
      where: {
        ...(options.type ? { documentType: options.type } : {}),
        ...(options.search
          ? {
              OR: [
                { title: { contains: options.search, mode: "insensitive" } },
                { correspondent: { contains: options.search, mode: "insensitive" } },
                { contentPreview: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  async count(options: Pick<ListDocumentsOptions, "type" | "search"> = {}): Promise<number> {
    return prisma.document.count({
      where: {
        ...(options.type ? { documentType: options.type } : {}),
        ...(options.search
          ? {
              OR: [
                { title: { contains: options.search, mode: "insensitive" } },
                { correspondent: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  }

  async create(input: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        title: input.title,
        externalId: input.externalId,
        externalUrl: input.externalUrl,
        sourceConnectionId: input.sourceConnectionId,
        documentType: input.documentType ?? "OTHER",
        correspondent: input.correspondent,
        tags: input.tags ?? [],
        contentPreview: input.contentPreview,
        inboxItemId: input.inboxItemId,
      },
    });
  }

  async update(id: string, input: UpdateDocumentInput): Promise<Document> {
    return prisma.document.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
        ...(input.documentType !== undefined ? { documentType: input.documentType } : {}),
        ...(input.correspondent !== undefined ? { correspondent: input.correspondent } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.contentPreview !== undefined ? { contentPreview: input.contentPreview } : {}),
        ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
      },
    });
  }

  async upsert(
    sourceConnectionId: string,
    externalId: string,
    input: CreateDocumentInput,
  ): Promise<{ document: Document; created: boolean }> {
    const existing = await this.findByExternalId(sourceConnectionId, externalId);
    if (existing) {
      const updated = await this.update(existing.id, {
        title: input.title,
        externalUrl: input.externalUrl,
        documentType: input.documentType,
        correspondent: input.correspondent,
        tags: input.tags,
        contentPreview: input.contentPreview,
      });
      return { document: updated, created: false };
    }
    const created = await this.create(input);
    return { document: created, created: true };
  }
}
