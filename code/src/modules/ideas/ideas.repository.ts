import { prisma } from "@/lib/db";
import type {
  Idea,
  CreateIdeaInput,
  UpdateIdeaInput,
  ListIdeasOptions,
} from "./ideas.types";

export class IdeasRepository {
  async findById(id: string): Promise<Idea | null> {
    return prisma.idea.findUnique({ where: { id } });
  }

  async list(options: ListIdeasOptions = {}): Promise<Idea[]> {
    const { status, search, tags, limit = 50, offset = 0 } = options;
    return prisma.idea.findMany({
      where: {
        ...(status && { status }),
        ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
        ...(search && { title: { contains: search, mode: "insensitive" } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async count(options: Pick<ListIdeasOptions, "status" | "search" | "tags"> = {}): Promise<number> {
    const { status, search, tags } = options;
    return prisma.idea.count({
      where: {
        ...(status && { status }),
        ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
        ...(search && { title: { contains: search, mode: "insensitive" } }),
      },
    });
  }

  async create(input: CreateIdeaInput): Promise<Idea> {
    return prisma.idea.create({
      data: {
        title: input.title,
        body: input.body,
        tags: input.tags ?? [],
        inboxItemId: input.inboxItemId,
      },
    });
  }

  async update(id: string, input: UpdateIdeaInput): Promise<Idea> {
    return prisma.idea.update({ where: { id }, data: input });
  }

  async promote(id: string, moduleId: string, entityId: string): Promise<Idea> {
    return prisma.idea.update({
      where: { id },
      data: {
        status: "PROMOTED",
        promotedToModule: moduleId,
        promotedToEntityId: entityId,
      },
    });
  }

  async archive(id: string): Promise<Idea> {
    return prisma.idea.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  async findByTag(tag: string): Promise<Idea[]> {
    return prisma.idea.findMany({
      where: { tags: { has: tag } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTags(): Promise<string[]> {
    const ideas = await prisma.idea.findMany({ select: { tags: true } });
    const tagSet = new Set<string>();
    ideas.forEach((idea) => {
      idea.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }
}
