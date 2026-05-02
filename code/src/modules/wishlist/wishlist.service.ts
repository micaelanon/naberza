import type { WishlistRepository } from "./wishlist.repository";
import type { WishlistItem } from "@prisma/client";
import type { CreateWishlistInput, UpdateWishlistInput, ListWishlistOptions, WishlistSummary } from "./wishlist.types";

export class WishlistService {
  constructor(private readonly repository: WishlistRepository) {}

  async getItem(id: string): Promise<WishlistItem | null> {
    return this.repository.findById(id);
  }

  async listItems(options: ListWishlistOptions = {}): Promise<{ items: WishlistSummary[]; total: number }> {
    const [items, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count(options),
    ]);
    return {
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        url: i.url,
        notes: i.notes,
        priceEst: i.priceEst?.toString() ?? null,
        currency: i.currency,
        priority: i.priority,
        status: i.status,
        tags: i.tags,
        purchasedAt: i.purchasedAt,
        createdAt: i.createdAt,
      })),
      total,
    };
  }

  async createItem(input: CreateWishlistInput): Promise<WishlistItem> {
    return this.repository.create(input);
  }

  async updateItem(id: string, input: UpdateWishlistInput): Promise<WishlistItem | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async markBought(id: string): Promise<WishlistItem | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.markBought(id);
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Wishlist item not found: ${id}`);
    await this.repository.delete(id);
  }
}
