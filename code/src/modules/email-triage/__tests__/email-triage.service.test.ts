import { describe, it, expect, vi, beforeEach } from "vitest";

import type { EmailTriageRepository } from "../email-triage.repository";
import type { MailImapAdapter } from "@/lib/adapters/mail/mail-imap.adapter";

const { repositoryMock, adapterMock, classifyEmailBatchMock } = vi.hoisted(
  () => ({
    repositoryMock: {
      createSession: vi.fn(),
      updateSessionStatus: vi.fn(),
      upsertItems: vi.fn(),
      getSession: vi.fn(),
      getSessionItems: vi.fn(),
      overrideItemDecision: vi.fn(),
      markItemExecuted: vi.fn(),
      listSessions: vi.fn(),
      getItemsByDecision: vi.fn(),
      markExecutedAt: vi.fn(),
      overrideSessionCategory: vi.fn(),
    },
    adapterMock: {
      fetchNewMessages: vi.fn(),
      trashMessage: vi.fn(),
    },
    classifyEmailBatchMock: vi.fn(),
  }),
);

vi.mock("@/lib/email-triage/email-classifier", () => ({
  classifyEmailBatch: classifyEmailBatchMock,
}));

import { EmailTriageService } from "../email-triage.service";

function makeService(): EmailTriageService {
  return new EmailTriageService(
    repositoryMock as unknown as EmailTriageRepository,
    () => adapterMock as unknown as MailImapAdapter,
  );
}

function readySession(overrides: Record<string, unknown> = {}): never {
  return { id: "s1", status: "READY", ...overrides } as never;
}

describe("EmailTriageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startSession", () => {
    it("creates session and returns sessionId", async () => {
      repositoryMock.createSession.mockResolvedValue({ id: "session-1" });
      const result = await makeService().startSession();
      expect(result.sessionId).toBe("session-1");
    });
  });

  describe("getSession", () => {
    it("returns session summary", async () => {
      const data = {
        id: "session-1", status: "READY" as const,
        totalFetched: 10, totalProcessed: 10,
        trashCount: 5, archiveCount: 2,
        keepCount: 2, reviewCount: 1,
        createdAt: new Date(), executedAt: null,
      };
      repositoryMock.getSession.mockResolvedValue(data);
      expect(await makeService().getSession("session-1")).toEqual(data);
    });
  });

  describe("executeSession", () => {
    it("throws when session not found", async () => {
      repositoryMock.getSession.mockResolvedValue(null);
      await expect(makeService().executeSession("x")).rejects.toThrow("Session not found");
    });

    it("throws when session not READY", async () => {
      repositoryMock.getSession.mockResolvedValue({ id: "s1", status: "PENDING" } as never);
      await expect(makeService().executeSession("s1")).rejects.toThrow("Session must be READY");
    });

    it("handles empty trash", async () => {
      repositoryMock.getSession.mockResolvedValue(readySession());
      repositoryMock.getItemsByDecision.mockResolvedValue([]);
      expect(await makeService().executeSession("s1")).toEqual({ trashed: 0, errors: 0 });
    });

    it("trashes all items", async () => {
      repositoryMock.getSession.mockResolvedValue(readySession());
      repositoryMock.getItemsByDecision.mockResolvedValue([
        { id: "i1", uid: 101 }, { id: "i2", uid: 102 },
      ]);
      adapterMock.trashMessage.mockResolvedValue(undefined);
      const result = await makeService().executeSession("s1");
      expect(result).toEqual({ trashed: 2, errors: 0 });
      expect(adapterMock.trashMessage).toHaveBeenNthCalledWith(1, 101);
      expect(adapterMock.trashMessage).toHaveBeenNthCalledWith(2, 102);
      expect(repositoryMock.markItemExecuted).toHaveBeenCalledTimes(2);
    });

    it("reports errors on failure", async () => {
      repositoryMock.getSession.mockResolvedValue(readySession());
      repositoryMock.getItemsByDecision.mockResolvedValue([
        { id: "i1", uid: 101 }, { id: "i2", uid: 102 },
      ]);
      adapterMock.trashMessage
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(undefined);
      const result = await makeService().executeSession("s1");
      expect(result).toEqual({ trashed: 1, errors: 1 });
    });
  });

  describe("overrideDecision", () => {
    it("overrides item decision", async () => {
      await makeService().overrideDecision("i1", "TRASH");
      expect(repositoryMock.overrideItemDecision).toHaveBeenCalledWith("i1", "TRASH");
    });
  });

  describe("overrideCategoryDecision", () => {
    it("overrides category decision", async () => {
      repositoryMock.overrideSessionCategory.mockResolvedValue(5);
      await makeService().overrideCategoryDecision("s1", "newsletter", "TRASH");
      expect(repositoryMock.overrideSessionCategory).toHaveBeenCalledWith("s1", "newsletter", "TRASH");
    });
  });

  describe("getSessionItems", () => {
    it("filters by decision", async () => {
      repositoryMock.getSessionItems.mockResolvedValue([
        { id: "i1", uid: 101, effectiveDecision: "TRASH" } as never,
      ]);
      const items = await makeService().getSessionItems("s1", { decision: "TRASH" });
      expect(items).toHaveLength(1);
    });

    it("returns all without filter", async () => {
      repositoryMock.getSessionItems.mockResolvedValue([]);
      expect(await makeService().getSessionItems("s1")).toEqual([]);
    });
  });

  describe("listSessions", () => {
    it("returns recent sessions", async () => {
      repositoryMock.listSessions.mockResolvedValue([
        { id: "s1", status: "DONE" } as never,
      ]);
      expect(await makeService().listSessions()).toHaveLength(1);
    });

    it("passes limit", async () => {
      repositoryMock.listSessions.mockResolvedValue([]);
      await makeService().listSessions(5);
      expect(repositoryMock.listSessions).toHaveBeenCalledWith(5);
    });
  });
});
