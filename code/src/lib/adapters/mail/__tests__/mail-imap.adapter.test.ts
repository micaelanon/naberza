import { describe, expect, it, vi, beforeEach } from "vitest";
import { MailImapAdapter } from "../mail-imap.adapter";
import type { ConnectionConfig } from "../../adapter-types";
import { AdapterError } from "../../adapter-types";

const baseConnection: ConnectionConfig = {
  id: "conn-mail-1",
  name: "Test Mail IMAP",
  type: "email_imap",
  status: "active",
  permissions: { read: true, write: false },
  config: {
    host: "imap.example.com",
    port: 993,
    secure: true,
    user: "test@example.com",
    password: "test-password-123",
    mailbox: "INBOX",
  },
};

describe("MailImapAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs correctly from connection config", () => {
    const adapter = new MailImapAdapter(baseConnection);
    expect(adapter.connectionId).toBe("conn-mail-1");
    expect(adapter.type).toBe("email_imap");
  });

  it("throws on missing host", () => {
    expect(
      () =>
        new MailImapAdapter({
          ...baseConnection,
          config: { port: 993, secure: true, user: "u", password: "p" },
        })
    ).toThrow(AdapterError);
  });

  it("throws on missing port", () => {
    expect(
      () =>
        new MailImapAdapter({
          ...baseConnection,
          config: { host: "imap.example.com", secure: true, user: "u", password: "p" },
        })
    ).toThrow(AdapterError);
  });

  it("throws on missing user", () => {
    expect(
      () =>
        new MailImapAdapter({
          ...baseConnection,
          config: { host: "imap.example.com", port: 993, secure: true, password: "p" },
        })
    ).toThrow(AdapterError);
  });

  it("throws on missing password", () => {
    expect(
      () =>
        new MailImapAdapter({
          ...baseConnection,
          config: { host: "imap.example.com", port: 993, secure: true, user: "u" },
        })
    ).toThrow(AdapterError);
  });

  it("returns healthy on successful connection", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: mockConnect,
      logout: mockLogout,
    } as never);
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(true);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it("returns unhealthy on connection failure", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      logout: vi.fn().mockResolvedValue(undefined),
    } as never);
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(false);
    expect(result.message).toContain("Cannot connect");
  });

  it("returns unhealthy with auth message on auth failure", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: vi.fn().mockRejectedValue(new Error("Authentication failed")),
      logout: vi.fn().mockResolvedValue(undefined),
    } as never);
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(false);
    expect(result.message).toContain("Authentication failed");
  });

  it("returns empty array when no new messages", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      mailboxOpen: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      logout: vi.fn().mockResolvedValue(undefined),
    } as never);
    const messages = await adapter.fetchNewMessages();
    expect(messages).toHaveLength(0);
  });

  it("throws AUTH_FAILED on auth error during fetchNewMessages", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: vi.fn().mockRejectedValue(new Error("auth failed")),
      logout: vi.fn().mockResolvedValue(undefined),
    } as never);
    await expect(adapter.fetchNewMessages()).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });

  it("maps fetched messages to EmailMessage shape", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    const mockMessages = [
      {
        uid: 42,
        envelope: {
          messageId: "<msg-42@example.com>",
          subject: "Test Subject",
          from: [{ name: "Alice", address: "alice@example.com" }],
          to: [{ address: "bob@example.com" }],
        },
        bodyStructure: { childNodes: [] },
        flags: new Set<string>(),
        internalDate: new Date("2026-04-17T05:00:00Z"),
      },
    ];
    vi.spyOn(adapter as never, "createClient").mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      mailboxOpen: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([42]),
      fetchAll: vi.fn().mockResolvedValue(mockMessages),
      logout: vi.fn().mockResolvedValue(undefined),
    } as never);
    const messages = await adapter.fetchNewMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].messageId).toBe("<msg-42@example.com>");
    expect(messages[0].subject).toBe("Test Subject");
    expect(messages[0].from).toBe("Alice <alice@example.com>");
    expect(messages[0].to).toEqual(["bob@example.com"]);
    expect(messages[0].isRead).toBe(false);
  });
});
