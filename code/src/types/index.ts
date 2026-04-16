// Shared TypeScript types
// Domain-specific types are defined in each module's own types files
// Only cross-module shared types belong here

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
