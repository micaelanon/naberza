import type { CreateAuditEntry, AuditEntry, AuditQueryParams, AuditQueryResult } from "./audit-types";

/**
 * Storage backend interface for audit entries.
 * Decoupled from the service so we can swap implementations:
 * - InMemoryAuditStore (testing, local dev)
 * - PrismaAuditStore (production, Phase 1)
 */
export interface AuditStore {
  append(entry: CreateAuditEntry): Promise<AuditEntry>;
  query(params: AuditQueryParams): Promise<AuditQueryResult>;
  count(params?: Omit<AuditQueryParams, "page" | "pageSize">): Promise<number>;
}

/**
 * In-memory audit store for development and testing.
 * Entries are lost when the process restarts.
 * Production uses PrismaAuditStore (implemented in Phase 1 with database).
 */
export class InMemoryAuditStore implements AuditStore {
  private entries: AuditEntry[] = [];
  private nextId = 1;

  async append(entry: CreateAuditEntry): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      ...entry,
      id: `audit-${this.nextId++}`,
      createdAt: new Date(),
    };
    this.entries.push(auditEntry);
    return auditEntry;
  }

  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    let filtered = this.filterEntries(params);

    // Sort newest first
    filtered = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      entries: items,
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
    };
  }

  async count(params?: Omit<AuditQueryParams, "page" | "pageSize">): Promise<number> {
    if (!params) return this.entries.length;
    return this.filterEntries(params).length;
  }

  // Exposed for testing teardown
  clear(): void {
    this.entries = [];
    this.nextId = 1;
  }

  private filterEntries(params: Partial<AuditQueryParams>): AuditEntry[] {
    const matchers = this.buildMatchers(params);
    return this.entries.filter((entry) => matchers.every((m) => m(entry)));
  }

  private buildMatchers(params: Partial<AuditQueryParams>): Array<(entry: AuditEntry) => boolean> {
    const matchers: Array<(entry: AuditEntry) => boolean> = [];
    if (params.module) matchers.push((e) => e.module === params.module);
    if (params.action) matchers.push((e) => e.action === params.action);
    if (params.entityType) matchers.push((e) => e.entityType === params.entityType);
    if (params.entityId) matchers.push((e) => e.entityId === params.entityId);
    if (params.actor) matchers.push((e) => e.actor === params.actor);
    if (params.status) matchers.push((e) => e.status === params.status);
    if (params.from) matchers.push((e) => e.createdAt >= params.from!);
    if (params.to) matchers.push((e) => e.createdAt <= params.to!);
    return matchers;
  }
}
