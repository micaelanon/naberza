export type { WishlistItem, WishlistStatus } from "@prisma/client";
export type { Priority } from "@prisma/client";

export interface CreateWishlistInput {
  title: string;
  url?: string;
  notes?: string;
  priceEst?: number;
  currency?: string;
  priority?: string;
  tags?: string[];
}

export interface UpdateWishlistInput {
  title?: string;
  url?: string;
  notes?: string;
  priceEst?: number;
  currency?: string;
  priority?: string;
  tags?: string[];
  status?: string;
  purchasedAt?: Date | null;
}

export interface ListWishlistOptions {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface WishlistSummary {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  priceEst: string | null;
  currency: string;
  priority: string;
  status: string;
  tags: string[];
  purchasedAt: Date | null;
  createdAt: Date;
}
