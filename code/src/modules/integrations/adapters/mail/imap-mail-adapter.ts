/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConnectionType, HealthCheckResult } from "../../providers";

import { NotImplementedError } from "../not-implemented-error";
import type {
  MailProvider,
  MailProviderCapabilities,
  EmailMessage,
  EmailAttachment,
  FetchMessagesParams,
} from "../../providers";

/**
 * IMAP mail provider stub.
 *
 * Protocol: IMAP over TLS
 * Auth: Username + password (stored encrypted in SourceConnection config)
 * Polling: Configurable interval (default 5 minutes)
 *
 * Processing flow:
 * 1. Fetch new messages since last check
 * 2. Create InboxItem per message
 * 3. Extract attachments for document/invoice detection
 * 4. Mark message as processed
 *
 * Implementation target: Phase 4
 * Reference: docs/integrations.md — Email Integration Details
 */
export class ImapMailAdapter implements MailProvider {
  readonly type: ConnectionType = "EMAIL_IMAP";
  readonly connectionId: string;

  readonly capabilities: MailProviderCapabilities = {
    canFetch: true,
    canMarkRead: true,
    supportsAttachments: true,
    supportsWebhook: false,
  };

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  async fetchNewMessages(_params?: FetchMessagesParams): Promise<EmailMessage[]> {
    throw new NotImplementedError("ImapMailAdapter", "fetchNewMessages");
  }

  async getMessage(_messageId: string): Promise<EmailMessage | null> {
    throw new NotImplementedError("ImapMailAdapter", "getMessage");
  }

  async getAttachment(_messageId: string, _attachmentId: string): Promise<EmailAttachment> {
    throw new NotImplementedError("ImapMailAdapter", "getAttachment");
  }

  async markAsRead(_messageId: string): Promise<void> {
    throw new NotImplementedError("ImapMailAdapter", "markAsRead");
  }

  async markAsProcessed(_messageId: string): Promise<void> {
    throw new NotImplementedError("ImapMailAdapter", "markAsProcessed");
  }

  async testConnection(): Promise<HealthCheckResult> {
    return {
      healthy: false,
      latencyMs: 0,
      message: "ImapMailAdapter not yet implemented (Phase 4)",
      checkedAt: new Date(),
    };
  }
}
