import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { prismaMock, eventBusMock, mailAdapterMock } = vi.hoisted(() => ({
  prismaMock: {
    inboxItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  eventBusMock: {
    emit: vi.fn(),
  },
  mailAdapterMock: {
    connectionId: "conn-mail-1",
    type: "imap" as const,
    fetchNewMessages: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/events", () => ({ eventBus: eventBusMock }));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { syncMailMessages } from "../mail.sync";
import type { MailImapAdapter } from "../mail-imap.adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    uid: 1,
    messageId: "<msg-1@example.com>",
    subject: "Test email",
    from: "sender@example.com",
    to: ["me@example.com"],
    date: new Date("2026-01-01T10:00:00Z"),
    body: "Hello world",
    attachments: [],
    flags: [],
    ...overrides,
  };
}

const adapter = mailAdapterMock as unknown as MailImapAdapter;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("syncMailMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });
    eventBusMock.emit.mockResolvedValue(undefined);
    mailAdapterMock.markAsRead.mockResolvedValue(undefined);
  });

  it("returns zeroed result when no messages", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([]);

    const result = await syncMailMessages(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("creates inbox items for new messages", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([
      makeMessage({ messageId: "<msg-1@example.com>" }),
      makeMessage({ uid: 2, messageId: "<msg-2@example.com>" }),
    ]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create
      .mockResolvedValueOnce({ id: "item-1", title: "Test email" })
      .mockResolvedValueOnce({ id: "item-2", title: "Test email" });

    const result = await syncMailMessages(adapter);

    expect(result).toEqual({ synced: 2, skipped: 0, errors: 0 });
    expect(prismaMock.inboxItem.create).toHaveBeenCalledTimes(2);
  });

  it("skips already existing messages", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage()]);
    prismaMock.inboxItem.findFirst.mockResolvedValue({ id: "existing" });

    const result = await syncMailMessages(adapter);

    expect(result).toEqual({ synced: 0, skipped: 1, errors: 0 });
    expect(prismaMock.inboxItem.create).not.toHaveBeenCalled();
  });

  it("counts errors when create throws", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage()]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockRejectedValue(new Error("DB error"));

    const result = await syncMailMessages(adapter);

    expect(result).toEqual({ synced: 0, skipped: 0, errors: 1 });
  });

  it("classifies as INVOICE when subject contains 'invoice'", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([
      makeMessage({ subject: "Your invoice #1234" }),
    ]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Your invoice #1234" });

    await syncMailMessages(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.classification).toBe("INVOICE");
  });

  it("classifies as INVOICE when has PDF attachment", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([
      makeMessage({ attachments: [{ filename: "doc.pdf", mimeType: "application/pdf", size: 1024 }] }),
    ]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });

    await syncMailMessages(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.classification).toBe("INVOICE");
  });

  it("classifies as DOCUMENT when has non-PDF attachments", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([
      makeMessage({ attachments: [{ filename: "photo.jpg", mimeType: "image/jpeg", size: 512 }] }),
    ]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });

    await syncMailMessages(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.classification).toBe("DOCUMENT");
  });

  it("classifies as REVIEW for plain emails", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage({ subject: "Hello there" })]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Hello there" });

    await syncMailMessages(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.classification).toBe("REVIEW");
  });

  it("marks messages as read when markAsRead option is true", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage({ uid: 42 })]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });

    await syncMailMessages(adapter, { markAsRead: true });

    expect(mailAdapterMock.markAsRead).toHaveBeenCalledWith(42);
  });

  it("does not mark as read by default", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage()]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });

    await syncMailMessages(adapter);

    expect(mailAdapterMock.markAsRead).not.toHaveBeenCalled();
  });

  it("emits inbox.item.created and inbox.item.classified events", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage()]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Test email" });

    await syncMailMessages(adapter);

    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.created", expect.objectContaining({ sourceType: "EMAIL" }));
    expect(eventBusMock.emit).toHaveBeenCalledWith("inbox.item.classified", expect.objectContaining({ itemId: "item-1" }));
  });

  it("passes 'since' option to fetchNewMessages", async () => {
    const since = new Date("2026-01-01");
    mailAdapterMock.fetchNewMessages.mockResolvedValue([]);

    await syncMailMessages(adapter, { since });

    expect(mailAdapterMock.fetchNewMessages).toHaveBeenCalledWith(since);
  });

  it("builds title from subject", async () => {
    mailAdapterMock.fetchNewMessages.mockResolvedValue([makeMessage({ subject: "Weekly Report" })]);
    prismaMock.inboxItem.findFirst.mockResolvedValue(null);
    prismaMock.inboxItem.create.mockResolvedValue({ id: "item-1", title: "Weekly Report" });

    await syncMailMessages(adapter);

    const createCall = prismaMock.inboxItem.create.mock.calls[0][0];
    expect(createCall.data.title).toBe("Weekly Report");
  });
});
