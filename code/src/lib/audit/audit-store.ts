import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { CreateAuditEntry, AuditEntry, AuditQueryParams, AuditQueryResult, AuditActor, AuditStatus } from "./audit-types";
import type { AuditActor as PrismaAuditActor, AuditStatus as PrismaAuditStatus } from "@prisma/client";

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

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toActor(actor: AuditActor): PrismaAuditActor {
  return actor.toUpperCase() as PrismaAuditActor;
}

function fromActor(actor: PrismaAuditActor): AuditActor {
  return actor.toLowerCase() as AuditActor;
}

function toStatus(status: AuditStatus): PrismaAuditStatus {
  return status.toUpperCase() as PrismaAuditStatus;
}

function fromStatus(status: PrismaAuditStatus): AuditStatus {
  return status.toLowerCase() as AuditStatus;
}

function toEntry(row: {
  id: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actor: PrismaAuditActor;
  actorDetail: string | null;
  input: unknown;
  output: unknown;
  status: PrismaAuditStatus;
  errorMessage: string | null;
  metadata: unknown;
  createdAt: Date;
}): AuditEntry {
  return {
    id: row.id,
    module: row.module,
    action: row.action,
    entityType: row.entityType ?? undefined,
    entityId: row.entityId ?? undefined,
    actor: fromActor(row.actor),
    actorDetail: row.actorDetail ?? undefined,
    input: (row.input as Record<string, unknown>) ?? undefined,
    output: (row.output as Record<string, unknown>) ?? undefined,
    status: fromStatus(row.status),
    errorMessage: row.errorMessage ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    createdAt: row.createdAt,
  };
}

// ─── PrismaAuditStore ─────────────────────────────────────────────────────────

/**
 * Prisma-backed audit store.
 * Persists audit events to the `audit_events` table via Prisma.
 */
export class PrismaAuditStore implements AuditStore {
  async append(entry: CreateAuditEntry): Promise<AuditEntry> {
    const row = await prisma.auditEvent.create({
      data: {
        module: entry.module,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actor: toActor(entry.actor),
        actorDetail: entry.actorDetail,
        input: entry.input as Prisma.InputJsonValue ?? undefined,
        output: entry.output as Prisma.InputJsonValue ?? undefined,
        status: toStatus(entry.status),
        errorMessage: entry.errorMessage,
        metadata: entry.metadata as Prisma.InputJsonValue ?? undefined,
      },
    });

    return toEntry(row);
  }

  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    const where = this.buildWhere(params);
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;

    const [rows, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return {
      entries: rows.map(toEntry),
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + rows.length < total,
    };
  }

  async count(params?: Omit<AuditQueryParams, "page" | "pageSize">): Promise<number> {
    return prisma.auditEvent.count({ where: this.buildWhere(params ?? {}) });
  }

  private buildWhere(params: Partial<AuditQueryParams>): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    this.applyScalarFilters(where, params);
    this.applyDateFilter(where, params);
    return where;
  }

  private applyScalarFilters(where: Record<string, unknown>, params: Partial<AuditQueryParams>): void {
    if (params.module) where.module = params.module;
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actor) where.actor = toActor(params.actor);
    if (params.status) where.status = toStatus(params.status);
  }

  private applyDateFilter(where: Record<string, unknown>, params: Partial<AuditQueryParams>): void {
    if (params.from ?? params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }
  }
}
