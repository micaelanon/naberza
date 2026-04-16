import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  CreateInboxItemDto,
  InboxFilters,
  InboxItem,
  InboxListResult,
  UpdateInboxItemDto,
} from "./inbox.types";

const DEFAULT_PAGE_SIZE = 20;

function buildWhereClause(filters: InboxFilters) {
  const { status, sourceType, classification, priority, search, from, to } = filters;

  const dateRange = from ?? to
    ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
    : {};

  const searchClause = search
    ? { OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { body: { contains: search, mode: "insensitive" as const } },
      ] }
    : {};

  return {
    ...(status && { status }),
    ...(sourceType && { sourceType }),
    ...(classification && { classification }),
    ...(priority && { priority }),
    ...searchClause,
    ...dateRange,
  };
}

function buildClassificationData(dto: UpdateInboxItemDto) {
  return {
    ...(dto.classification !== undefined && { classification: dto.classification }),
    ...(dto.classifiedBy !== undefined && { classifiedBy: dto.classifiedBy }),
    ...(dto.classificationConfidence !== undefined && {
      classificationConfidence: dto.classificationConfidence,
    }),
  };
}

function buildUpdateData(dto: UpdateInboxItemDto) {
  const base = {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.body !== undefined && { body: dto.body }),
    ...buildClassificationData(dto),
  };

  const routing = {
    ...(dto.status !== undefined && { status: dto.status }),
    ...(dto.routedToModule !== undefined && { routedToModule: dto.routedToModule }),
    ...(dto.routedToEntityId !== undefined && { routedToEntityId: dto.routedToEntityId }),
    ...(dto.priority !== undefined && { priority: dto.priority }),
    ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
    ...(dto.processedAt !== undefined && { processedAt: dto.processedAt }),
  };

  return { ...base, ...routing };
}

export class InboxRepository {
  async findAll(filters: InboxFilters = {}): Promise<InboxListResult> {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;
    const where = buildWhereClause(filters);

    const [items, total] = await Promise.all([
      prisma.inboxItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inboxItem.count({ where }),
    ]);

    return { items: items as InboxItem[], total, page, pageSize };
  }

  async findById(id: string): Promise<InboxItem | null> {
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    return item as InboxItem | null;
  }

  async create(dto: CreateInboxItemDto): Promise<InboxItem> {
    const item = await prisma.inboxItem.create({
      data: {
        title: dto.title,
        body: dto.body,
        sourceType: dto.sourceType,
        sourceConnectionId: dto.sourceConnectionId,
        sourceExternalId: dto.sourceExternalId,
        sourceRawPayload: dto.sourceRawPayload as Prisma.InputJsonValue ?? Prisma.JsonNull,
        priority: dto.priority ?? "NONE",
        metadata: dto.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    });
    return item as InboxItem;
  }

  async update(id: string, dto: UpdateInboxItemDto): Promise<InboxItem> {
    const item = await prisma.inboxItem.update({
      where: { id },
      data: buildUpdateData(dto),
    });
    return item as InboxItem;
  }

  async dismiss(id: string): Promise<InboxItem> {
    const item = await prisma.inboxItem.update({
      where: { id },
      data: { status: "DISMISSED" },
    });
    return item as InboxItem;
  }

  async delete(id: string): Promise<void> {
    await prisma.inboxItem.delete({ where: { id } });
  }
}
