import { describe, it, expect, vi, beforeEach } from "vitest";

const { repositoryMock, eventBusMock } = vi.hoisted(() => ({
  repositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    flagAnomaly: vi.fn(),
    findAnomalies: vi.fn(),
  },
  eventBusMock: {
    emit: vi.fn(),
  },
}));

vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

import { FinanceService } from "../finance.service";
import type { FinanceRepository } from "../finance.repository";

const service = new FinanceService(repositoryMock as unknown as FinanceRepository);

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    type: "EXPENSE" as const,
    amount: { toString: () => "49.99" } as unknown as number,
    currency: "EUR",
    category: "utilities",
    description: "Electric bill",
    date: new Date("2026-01-15"),
    invoiceId: null,
    isAnomaly: false,
    anomalyReason: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ─── getEntry ─────────────────────────────────────────────────────────────────

describe("FinanceService.getEntry", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns entry when found", async () => {
    repositoryMock.findById.mockResolvedValue(makeEntry());
    const result = await service.getEntry("entry-1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("entry-1");
  });

  it("returns null when not found", async () => {
    repositoryMock.findById.mockResolvedValue(null);
    const result = await service.getEntry("missing");
    expect(result).toBeNull();
  });
});

// ─── listEntries ──────────────────────────────────────────────────────────────

describe("FinanceService.listEntries", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns items and total", async () => {
    repositoryMock.list.mockResolvedValue([makeEntry()]);
    repositoryMock.count.mockResolvedValue(1);

    const result = await service.listEntries();

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("maps entry to summary shape with formatted amount", async () => {
    repositoryMock.list.mockResolvedValue([makeEntry()]);
    repositoryMock.count.mockResolvedValue(1);

    const result = await service.listEntries();
    const item = result.items[0];

    expect(item).toMatchObject({
      id: "entry-1",
      type: "EXPENSE",
      amount: "49.99",
      currency: "EUR",
      category: "utilities",
      isAnomaly: false,
    });
  });

  it("returns empty list when no entries", async () => {
    repositoryMock.list.mockResolvedValue([]);
    repositoryMock.count.mockResolvedValue(0);

    const result = await service.listEntries();

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("passes filters to repository", async () => {
    repositoryMock.list.mockResolvedValue([]);
    repositoryMock.count.mockResolvedValue(0);

    const from = new Date("2026-01-01");
    const to = new Date("2026-01-31");
    await service.listEntries({ type: "INCOME", isAnomaly: false, from, to, limit: 10 });

    expect(repositoryMock.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: "INCOME", isAnomaly: false, from, to, limit: 10 }),
    );
  });
});

// ─── createEntry ──────────────────────────────────────────────────────────────

describe("FinanceService.createEntry", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const input = {
    type: "EXPENSE" as const,
    amount: 49.99,
    date: new Date("2026-01-15"),
  };

  it("creates entry and returns it", async () => {
    repositoryMock.create.mockResolvedValue(makeEntry());
    const result = await service.createEntry(input);
    expect(result.id).toBe("entry-1");
  });

  it("emits finance.entry.created event", async () => {
    repositoryMock.create.mockResolvedValue(makeEntry());

    await service.createEntry(input);

    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "finance.entry.created",
      expect.objectContaining({
        entryId: "entry-1",
        type: "EXPENSE",
        currency: "EUR",
        timestamp: expect.any(Date),
        actor: { type: "system" },
      }),
    );
  });
});

// ─── updateEntry ──────────────────────────────────────────────────────────────

describe("FinanceService.updateEntry", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns updated entry when found", async () => {
    const updated = makeEntry({ category: "rent" });
    repositoryMock.findById.mockResolvedValue(makeEntry());
    repositoryMock.update.mockResolvedValue(updated);

    const result = await service.updateEntry("entry-1", { category: "rent" });

    expect(result?.category).toBe("rent");
  });

  it("returns null when entry not found", async () => {
    repositoryMock.findById.mockResolvedValue(null);

    const result = await service.updateEntry("missing", { category: "rent" });

    expect(result).toBeNull();
    expect(repositoryMock.update).not.toHaveBeenCalled();
  });
});

// ─── flagAnomaly ──────────────────────────────────────────────────────────────

describe("FinanceService.flagAnomaly", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("flags entry as anomaly", async () => {
    const flagged = makeEntry({ isAnomaly: true, anomalyReason: "Duplicate charge" });
    repositoryMock.findById.mockResolvedValue(makeEntry());
    repositoryMock.flagAnomaly.mockResolvedValue(flagged);

    const result = await service.flagAnomaly("entry-1", "Duplicate charge");

    expect(result?.isAnomaly).toBe(true);
    expect(result?.anomalyReason).toBe("Duplicate charge");
  });

  it("emits finance.anomaly.detected event", async () => {
    repositoryMock.findById.mockResolvedValue(makeEntry());
    repositoryMock.flagAnomaly.mockResolvedValue(makeEntry({ isAnomaly: true, anomalyReason: "Dup" }));

    await service.flagAnomaly("entry-1", "Dup");

    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "finance.anomaly.detected",
      expect.objectContaining({
        entryId: "entry-1",
        anomalyReason: "Dup",
        timestamp: expect.any(Date),
        actor: { type: "system" },
      }),
    );
  });

  it("returns null when entry not found", async () => {
    repositoryMock.findById.mockResolvedValue(null);

    const result = await service.flagAnomaly("missing", "reason");

    expect(result).toBeNull();
    expect(repositoryMock.flagAnomaly).not.toHaveBeenCalled();
  });
});

// ─── listAnomalies ────────────────────────────────────────────────────────────

describe("FinanceService.listAnomalies", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns anomaly entries as summaries", async () => {
    repositoryMock.findAnomalies.mockResolvedValue([
      makeEntry({ isAnomaly: true, anomalyReason: "Dup" }),
    ]);

    const result = await service.listAnomalies();

    expect(result).toHaveLength(1);
    expect(result[0].isAnomaly).toBe(true);
    expect(result[0].anomalyReason).toBe("Dup");
  });

  it("returns empty array when no anomalies", async () => {
    repositoryMock.findAnomalies.mockResolvedValue([]);
    const result = await service.listAnomalies();
    expect(result).toHaveLength(0);
  });
});
