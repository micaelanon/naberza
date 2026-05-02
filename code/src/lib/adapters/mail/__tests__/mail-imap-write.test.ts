import { Readable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConnectionConfig } from "@/lib/adapters/adapter-types";
import { MailImapAdapter } from "@/lib/adapters/mail/mail-imap.adapter";

const { clientMock, imapFlowMock } = vi.hoisted(() => {
  const mockClient = {
    connect: vi.fn(),
    mailboxOpen: vi.fn(),
    messageMove: vi.fn(),
    messageDelete: vi.fn(),
    download: vi.fn(),
    logout: vi.fn(),
  };

  return {
    clientMock: mockClient,
    imapFlowMock: vi.fn(() => mockClient),
  };
});

vi.mock("imapflow", () => ({
  ImapFlow: imapFlowMock,
}));

const baseConnection: ConnectionConfig = {
  id: "conn-mail-1",
  name: "Test Mail IMAP",
  type: "email_imap",
  status: "active",
  permissions: { read: true, write: true },
  config: {
    host: "imap.example.com",
    port: 993,
    secure: true,
    user: "test@example.com",
    password: "test-password-123",
    mailbox: "INBOX",
  },
};

describe("MailImapAdapter write operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.connect.mockResolvedValue(undefined);
    clientMock.mailboxOpen.mockResolvedValue(undefined);
    clientMock.messageMove.mockResolvedValue(undefined);
    clientMock.messageDelete.mockResolvedValue(undefined);
    clientMock.download.mockResolvedValue({
      meta: { contentType: "text/plain", expectedSize: 11 },
      content: Readable.from(["hello world"]),
    });
    clientMock.logout.mockResolvedValue(undefined);
  });

  it("calls messageMove with the Gmail trash path", async () => {
    const adapter = new MailImapAdapter(baseConnection);

    await adapter.trashMessage(42);

    expect(clientMock.connect).toHaveBeenCalledTimes(1);
    expect(clientMock.mailboxOpen).toHaveBeenCalledWith("INBOX");
    expect(clientMock.messageMove).toHaveBeenCalledWith("42", "[Gmail]/Trash", { uid: true });
    expect(clientMock.messageDelete).not.toHaveBeenCalled();
    expect(clientMock.logout).toHaveBeenCalledTimes(1);
  });

  it("falls back to messageDelete when move fails because trash mailbox does not exist", async () => {
    const adapter = new MailImapAdapter(baseConnection);
    clientMock.messageMove.mockRejectedValue(new Error("NO [TRYCREATE] Mailbox doesn't exist"));

    await adapter.trashMessage(77);

    expect(clientMock.messageMove).toHaveBeenCalledWith("77", "[Gmail]/Trash", { uid: true });
    expect(clientMock.messageDelete).toHaveBeenCalledWith("77", { uid: true });
    expect(clientMock.logout).toHaveBeenCalledTimes(1);
  });

  it("returns the downloaded message body as snippet", async () => {
    const adapter = new MailImapAdapter(baseConnection);

    const result = await adapter.fetchMessageSnippet(12);

    expect(clientMock.download).toHaveBeenCalledWith("12", "TEXT", { uid: true });
    expect(result).toEqual({ body: "hello world" });
    expect(clientMock.logout).toHaveBeenCalledTimes(1);
  });
});
