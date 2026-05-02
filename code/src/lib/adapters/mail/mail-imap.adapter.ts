import { Readable } from "node:stream";

import { ImapFlow } from "imapflow";

import type { BaseAdapter, ConnectionConfig, HealthCheckResult } from "@/lib/adapters/adapter-types";
import { AdapterError } from "@/lib/adapters/adapter-types";

export interface MailImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

export interface EmailAttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  messageId: string;
  uid: number;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  attachments: EmailAttachmentMeta[];
  isRead: boolean;
}

export interface EmailMessageSnippet {
  body: string;
  bodyHtml?: string;
}

function assertMailImapConfig(config: Record<string, unknown>): MailImapConfig {
  if (typeof config.host !== "string" || !config.host) {
    throw new AdapterError("VALIDATION_ERROR", "Mail IMAP config missing host");
  }
  if (typeof config.port !== "number" || config.port <= 0) {
    throw new AdapterError("VALIDATION_ERROR", "Mail IMAP config missing or invalid port");
  }
  if (typeof config.user !== "string" || !config.user) {
    throw new AdapterError("VALIDATION_ERROR", "Mail IMAP config missing user");
  }
  if (typeof config.password !== "string" || !config.password) {
    throw new AdapterError("VALIDATION_ERROR", "Mail IMAP config missing password");
  }
  return {
    host: config.host,
    port: config.port,
    secure: config.secure === true,
    user: config.user,
    password: config.password,
    mailbox: typeof config.mailbox === "string" ? config.mailbox : "INBOX",
  };
}

function buildFromAddress(envelope: { from?: Array<{ name?: string; address?: string }> }): string {
  const addr = envelope.from?.[0];
  if (!addr) return "unknown";
  if (addr.name && addr.address) return `${addr.name} <${addr.address}>`;
  return addr.address ?? addr.name ?? "unknown";
}

function buildToAddresses(envelope: { to?: Array<{ address?: string }> }): string[] {
  return (envelope.to ?? []).map((a) => a.address ?? "").filter(Boolean);
}

function buildAttachments(bodyStructure?: {
  childNodes?: Array<{
    disposition?: string;
    dispositionParameters?: Record<string, string>;
    type: string;
    size?: number;
    part?: string;
  }>;
}): EmailAttachmentMeta[] {
  if (!bodyStructure?.childNodes) return [];
  return bodyStructure.childNodes
    .filter((node) => node.disposition === "attachment")
    .map((node, i) => ({
      id: node.part ?? String(i + 1),
      filename: node.dispositionParameters?.filename ?? `attachment-${i + 1}`,
      mimeType: node.type,
      size: node.size ?? 0,
    }));
}

function parseInternalDate(raw: Date | string | undefined): Date {
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") return new Date(raw);
  return new Date();
}

function isTrashMoveFallbackError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  const errorMessage = err.message.toLowerCase();
  return errorMessage.includes("no [trycreate]") || errorMessage.includes("mailbox doesn't exist");
}

async function readStreamContent(content: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of content) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
      continue;
    }

    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export class MailImapAdapter implements BaseAdapter {
  readonly type = "email_imap" as const;
  readonly connectionId: string;

  private readonly config: MailImapConfig;

  constructor(connection: ConnectionConfig) {
    this.connectionId = connection.id;
    this.config = assertMailImapConfig(connection.config);
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      logger: false,
    });
  }

  async testConnection(): Promise<HealthCheckResult> {
    const start = Date.now();
    const client = this.createClient();
    try {
      await client.connect();
      await client.logout();
      return { healthy: true, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const isAuth = message.toLowerCase().includes("auth") || message.toLowerCase().includes("login");
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: isAuth ? "Authentication failed — check credentials" : `Cannot connect: ${message}`,
        checkedAt: new Date(),
      };
    }
  }

  private async connectClient(client: ImapFlow): Promise<void> {
    try {
      await client.connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      const isAuth = msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("login");
      if (isAuth) {
        throw new AdapterError("AUTH_FAILED", "Mail authentication failed — check credentials");
      }
      throw new AdapterError("CONNECTION_FAILED", `Cannot connect to mail server at ${this.config.host}`, err, true);
    }
  }

  private mapFetchedMessage(msg: {
    uid: number;
    envelope?: { messageId?: string; subject?: string; from?: Array<{ name?: string; address?: string }>; to?: Array<{ address?: string }> };
    bodyStructure?: Parameters<typeof buildAttachments>[0];
    flags?: Set<string>;
    internalDate?: Date | string;
  }): EmailMessage {
    return {
      messageId: msg.envelope?.messageId ?? `uid-${msg.uid}`,
      uid: msg.uid,
      from: buildFromAddress(msg.envelope ?? {}),
      to: buildToAddresses(msg.envelope ?? {}),
      subject: msg.envelope?.subject ?? "(no subject)",
      body: "",
      date: parseInternalDate(msg.internalDate),
      attachments: buildAttachments(msg.bodyStructure),
      isRead: msg.flags?.has("\\Seen") ?? false,
    };
  }

  async fetchNewMessages(since?: Date): Promise<EmailMessage[]> {
    const client = this.createClient();
    const mailbox = this.config.mailbox ?? "INBOX";

    await this.connectClient(client);

    try {
      await client.mailboxOpen(mailbox);

      const searchCriteria: Record<string, unknown> = { seen: false };
      if (since) searchCriteria["since"] = since;

      const rawUids = await client.search(searchCriteria, { uid: true });
      const uids: number[] = Array.isArray(rawUids) ? rawUids : [];
      if (!uids.length) return [];

      const messages = await client.fetchAll(uids.join(","), {
        envelope: true,
        bodyStructure: true,
        flags: true,
        internalDate: true,
      }, { uid: true });

      return messages.map((msg) => this.mapFetchedMessage(msg));
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError("EXTERNAL_ERROR", "Error fetching messages", err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  async markAsRead(uid: number): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    } catch (err) {
      throw new AdapterError("EXTERNAL_ERROR", `Failed to mark message ${uid} as read`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  async trashMessage(uid: number): Promise<void> {
    const client = this.createClient();

    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");
      await client.messageMove(String(uid), "[Gmail]/Trash", { uid: true });
    } catch (err) {
      if (isTrashMoveFallbackError(err)) {
        try {
          await client.messageDelete(String(uid), { uid: true });
          return;
        } catch (fallbackError) {
          throw new AdapterError("EXTERNAL_ERROR", `Failed to trash message ${uid}`, fallbackError);
        }
      }

      throw new AdapterError("EXTERNAL_ERROR", `Failed to trash message ${uid}`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  async fetchMessageSnippet(uid: number): Promise<EmailMessageSnippet> {
    const client = this.createClient();

    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");

      const downloadResult = await client.download(String(uid), "TEXT", { uid: true });
      const bodyContent = await readStreamContent(downloadResult.content);
      const isHtmlContent = downloadResult.meta.contentType.toLowerCase().includes("text/html");

      return isHtmlContent
        ? { body: bodyContent, bodyHtml: bodyContent }
        : { body: bodyContent };
    } catch (err) {
      throw new AdapterError("EXTERNAL_ERROR", `Failed to fetch message snippet ${uid}`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}
