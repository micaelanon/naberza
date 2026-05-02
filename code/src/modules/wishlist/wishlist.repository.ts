import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { WishlistItem } from "@prisma/client";
import type { CreateWishlistInput, UpdateWishlistInput, ListWishlistOptions } from "./wishlist.types";

export class WishlistRepository {
  async findById(id: string): Promise<WishlistItem | null> {
    return prisma.wishlistItem.findUnique({ where: { id } });
  }

  async list(options: ListWishlistOptions = {}): Promise<WishlistItem[]> {
    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    if (options.priority) where.priority = options.priority;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { notes: { contains: options.search, mode: "insensitive" } },
      ];
    }
    return prisma.wishlistItem.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      take: options.pageSize ?? 50,
      skip: ((options.page ?? 1) - 1) * (options.pageSize ?? 50),
    });
  }

  async count(options: ListWishlistOptions = {}): Promise<number> {
    const where: Record<string, unknown> = {};
    if (options.status) where.status = options.status;
    if (options.priority) where.priority = options.priority;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { notes: { contains: options.search, mode: "insensitive" } },
      ];
    }
    return prisma.wishlistItem.count({ where: where as never });
  }

  async create(input: CreateWishlistInput): Promise<WishlistItem> {
    return prisma.wishlistItem.create({
      data: {
        title: input.title,
        url: input.url,
        notes: input.notes,
        priceEst: input.priceEst ? new Prisma.Decimal(input.priceEst) : null,
        currency: input.currency ?? "EUR",
        priority: (input.priority ?? "MEDIUM") as never,
        tags: input.tags ?? [],
      },
    });
  }

  async update(id: string, input: UpdateWishlistInput): Promise<WishlistItem> {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.url !== undefined) data.url = input.url;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.priceEst !== undefined) data.priceEst = new Prisma.Decimal(input.priceEst);
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.status !== undefined) data.status = input.status;
    if (input.purchasedAt !== undefined) data.purchasedAt = input.purchasedAt;
    return prisma.wishlistItem.update({ where: { id }, data: data as never });
  }

  async delete(id: string): Promise<void> {
    await prisma.wishlistItem.delete({ where: { id } });
  }

  async markBought(id: string): Promise<WishlistItem> {
    return prisma.wishlistItem.update({
      where: { id },
      data: { status: "BOUGHT" as never, purchasedAt: new Date() },
    });
  }
}
