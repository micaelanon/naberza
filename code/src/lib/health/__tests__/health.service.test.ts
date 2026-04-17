import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildHealthReport } from "../health.service";

const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({ $queryRaw: mockQueryRaw }));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

describe("buildHealthReport — database ok", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.SMTP_HOST;
  });

  it("returns status ok when all deps resolve", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.SMTP_HOST = "smtp.example.com";
    const report = await buildHealthReport("1.0.0");
    expect(report.status).toBe("ok");
    expect(report.version).toBe("1.0.0");
    expect(report.dependencies).toHaveLength(3);
  });

  it("returns degraded when optional env vars missing", async () => {
    const report = await buildHealthReport("1.0.0");
    expect(report.status).toBe("degraded");
    const telegram = report.dependencies.find((d) => d.name === "telegram");
    expect(telegram?.status).toBe("degraded");
  });

  it("includes uptime as non-negative number", async () => {
    const report = await buildHealthReport("1.0.0");
    expect(report.uptime).toBeGreaterThanOrEqual(0);
  });

  it("includes ISO timestamp", async () => {
    const report = await buildHealthReport("1.0.0");
    expect(() => new Date(report.timestamp)).not.toThrow();
  });
});

describe("buildHealthReport — database error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw.mockRejectedValue(new Error("connection refused"));
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.SMTP_HOST = "smtp.example.com";
  });

  it("returns status error when DB is down", async () => {
    const report = await buildHealthReport("1.0.0");
    expect(report.status).toBe("error");
    const db = report.dependencies.find((d) => d.name === "database");
    expect(db?.status).toBe("error");
    expect(db?.detail).toContain("connection refused");
  });
});
