import { ImapFlow } from "imapflow";
import type { BaseAdapter, ConnectionConfig, HealthCheckResult } from "../adapter-types";
import { AdapterError } from "../adapter-types";

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
    text?: string;
  }): EmailMessage {
    // Extract text content from email body
    let body = "";
    if (msg.text) {
      body = msg.text;
      // For very long emails, truncate to first 5000 chars for matching performance
      if (body.length > 5000) {
        body = body.substring(0, 5000);
      }
    }

    return {
      messageId: msg.envelope?.messageId ?? `uid-${msg.uid}`,
      uid: msg.uid,
      from: buildFromAddress(msg.envelope ?? {}),
      to: buildToAddresses(msg.envelope ?? {}),
      subject: msg.envelope?.subject ?? "(no subject)",
      body,
      date: parseInternalDate(msg.internalDate),
      attachments: buildAttachments(msg.bodyStructure),
      isRead: msg.flags?.has("\\Seen") ?? false,
    };
  }

  /**
   * Fetch new (unread) messages since a given date.
   * Only returns emails that haven't been marked as read.
   */
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
        text: true,  // Fetch plain text content for matching
      }, { uid: true });

      return messages.map((msg) => this.mapFetchedMessage(msg));
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError("EXTERNAL_ERROR", "Error fetching messages", err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  /**
   * Fetch ALL messages (read and unread) since a given date.
   * Used for email cleanup rules that need to match against all emails,
   * not just unread ones.
   *
   * NOTE: Processes in batches of 500 UIDs to avoid IMAP server timeouts
   * when dealing with large mailboxes (1000+).
   */
  async fetchAllMessages(since?: Date): Promise<EmailMessage[]> {
    const client = this.createClient();
    const mailbox = this.config.mailbox ?? "INBOX";

    await this.connectClient(client);

    try {
      await client.mailboxOpen(mailbox);

      // Search for all messages, regardless of read status
      const searchCriteria: Record<string, unknown> = {};
      if (since) searchCriteria["since"] = since;

      const rawUids = await client.search(searchCriteria, { uid: true });
      const uids: number[] = Array.isArray(rawUids) ? rawUids : [];
      if (!uids.length) return [];

      // Process in batches of 500 to avoid timeout with large mailboxes
      const BATCH_SIZE = 500;
      const allMessages: EmailMessage[] = [];

      for (let i = 0; i < uids.length; i += BATCH_SIZE) {
        const batch = uids.slice(i, i + BATCH_SIZE);
        const messages = await client.fetchAll(batch.join(","), {
          envelope: true,
          bodyStructure: true,
          flags: true,
          internalDate: true,
          text: true,  // Fetch plain text content for matching
        }, { uid: true });

        allMessages.push(...messages.map((msg) => this.mapFetchedMessage(msg)));
      }

      return allMessages;
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError("EXTERNAL_ERROR", "Error fetching all messages", err);
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

  /**
   * Delete an email by UID.
   * Moves the message to Trash (marks with \Deleted flag and expunges).
   */
  async deleteMessage(uid: number): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");
      // Mark with \Deleted flag
      await client.messageFlagsAdd(String(uid), ["\\Deleted"], { uid: true });
      // Expunge to permanently remove
      await client.mailboxExpunge();
    } catch (err) {
      throw new AdapterError("EXTERNAL_ERROR", `Failed to delete message ${uid}`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  /**
   * Archive an email by moving it to an archive folder.
   * Typically moves to [Gmail]/All Mail or Archive folder.
   */
  async archiveMessage(uid: number, archiveFolder: string = "[Gmail]/All Mail"): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");
      // Move message to archive folder
      await client.messageMove(String(uid), archiveFolder, { uid: true });
    } catch (err) {
      // If archive folder doesn't exist, try generic Archive folder
      if (archiveFolder === "[Gmail]/All Mail") {
        try {
          await client.mailboxOpen(this.config.mailbox ?? "INBOX");
          await client.messageMove(String(uid), "Archive", { uid: true });
          return;
        } catch (retryErr) {
          // If that also fails, just mark as seen instead
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          return;
        }
      }
      throw new AdapterError("EXTERNAL_ERROR", `Failed to archive message ${uid}`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  /**
   * Add a label/flag to an email.
   * Custom labels in IMAP are stored as keywords.
   */
  async addLabel(uid: number, label: string): Promise<void> {
    const client = this.createClient();
    try {
      await client.connect();
      await client.mailboxOpen(this.config.mailbox ?? "INBOX");
      // Add as a custom keyword flag
      await client.messageFlagsAdd(String(uid), [label], { uid: true });
    } catch (err) {
      throw new AdapterError("EXTERNAL_ERROR", `Failed to add label "${label}" to message ${uid}`, err);
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}
