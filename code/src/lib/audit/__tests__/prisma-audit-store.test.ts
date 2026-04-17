import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { PrismaAuditStore } from "../audit-store";
import type { CreateAuditEntry } from "../audit-types";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-prisma-1",
    module: "tasks",
    action: "task.created",
    entityType: "Task",
    entityId: "task-1",
    actor: "SYSTEM",
    actorDetail: null,
    input: { title: "Test" },
    output: null,
    status: "SUCCESS",
    errorMessage: null,
    metadata: null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  };
}

const baseEntry: CreateAuditEntry = {
  module: "tasks",
  action: "task.created",
  entityType: "Task",
  entityId: "task-1",
  actor: "system",
  status: "success",
};

describe("PrismaAuditStore", () => {
  let store: PrismaAuditStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PrismaAuditStore();
  });

  describe("append", () => {
    it("creates an audit event in Prisma and returns mapped entry", async () => {
      const row = makeRow();
      prismaMock.auditEvent.create.mockResolvedValue(row);

      const result = await store.append(baseEntry);

      expect(prismaMock.auditEvent.create).toHaveBeenCalledOnce();
      expect(result.id).toBe("audit-prisma-1");
      expect(result.actor).toBe("system");
      expect(result.status).toBe("success");
      expect(result.module).toBe("tasks");
    });

    it("maps actor to uppercase before persisting", async () => {
      prismaMock.auditEvent.create.mockResolvedValue(makeRow());
      await store.append({ ...baseEntry, actor: "user" });

      expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ actor: "USER" }) }),
      );
    });

    it("maps status to uppercase before persisting", async () => {
      prismaMock.auditEvent.create.mockResolvedValue(makeRow({ status: "FAILURE" }));
      await store.append({ ...baseEntry, status: "failure" });

      expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "FAILURE" }) }),
      );
    });

    it("maps actor back to lowercase in returned entry", async () => {
      prismaMock.auditEvent.create.mockResolvedValue(makeRow({ actor: "AUTOMATION" }));
      const result = await store.append({ ...baseEntry, actor: "automation" });

      expect(result.actor).toBe("automation");
    });

    it("maps nullable fields to undefined", async () => {
      prismaMock.auditEvent.create.mockResolvedValue(makeRow({ entityType: null, entityId: null }));
      const result = await store.append(baseEntry);

      expect(result.entityType).toBeUndefined();
      expect(result.entityId).toBeUndefined();
    });
  });

  describe("query", () => {
    it("returns paginated entries and total", async () => {
      const row = makeRow();
      prismaMock.auditEvent.findMany.mockResolvedValue([row]);
      prismaMock.auditEvent.count.mockResolvedValue(1);

      const result = await store.query({ module: "tasks", page: 1, pageSize: 10 });

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it("calculates hasMore correctly", async () => {
      const rows = Array.from({ length: 10 }, (_, i) => makeRow({ id: `audit-${i}` }));
      prismaMock.auditEvent.findMany.mockResolvedValue(rows);
      prismaMock.auditEvent.count.mockResolvedValue(25);

      const result = await store.query({ page: 1, pageSize: 10 });

      expect(result.hasMore).toBe(true);
    });

    it("passes actor filter as uppercase to Prisma", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(0);

      await store.query({ actor: "user" });

      expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ actor: "USER" }) }),
      );
    });

    it("passes status filter as uppercase to Prisma", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(0);

      await store.query({ status: "failure" });

      expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "FAILURE" }) }),
      );
    });

    it("applies date range filter", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(0);

      const from = new Date("2026-01-01");
      const to = new Date("2026-01-31");
      await store.query({ from, to });

      expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        }),
      );
    });
  });

  describe("count", () => {
    it("returns total count when no filters", async () => {
      prismaMock.auditEvent.count.mockResolvedValue(42);
      const result = await store.count();
      expect(result).toBe(42);
    });

    it("passes module filter to Prisma count", async () => {
      prismaMock.auditEvent.count.mockResolvedValue(5);
      await store.count({ module: "inbox" });

      expect(prismaMock.auditEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ module: "inbox" }) }),
      );
    });
  });
});
