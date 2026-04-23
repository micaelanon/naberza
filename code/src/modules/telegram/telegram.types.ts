import { Priority } from "@prisma/client";

// ─────────────────────────────────────────────
// Telegram Preference Types
// ─────────────────────────────────────────────

export interface TelegramPreference {
  id: string;
  userId: string;
  telegramUserId: number | null;
  telegramUsername: string | null;
  telegramEnabled: boolean;
  verificationCode: string | null;
  verificationExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTelegramPreferenceInput {
  userId: string;
  telegramUserId?: number;
  telegramUsername?: string;
}

export interface UpdateTelegramPreferenceInput {
  telegramUserId?: number;
  telegramUsername?: string;
  telegramEnabled?: boolean;
  verificationCode?: string | null;
  verificationExpires?: Date | null;
}

// ─────────────────────────────────────────────
// Telegram Alert Types
// ─────────────────────────────────────────────

export enum AlertTriggerType {
  PRIORITY_SENDER = "PRIORITY_SENDER",
  KEYWORD = "KEYWORD",
  UNPAID_INVOICE = "UNPAID_INVOICE",
  URGENT_TASK = "URGENT_TASK",
  FINANCE_SUMMARY = "FINANCE_SUMMARY",
  DAILY_DIGEST = "DAILY_DIGEST",
  WEEKLY_DIGEST = "WEEKLY_DIGEST",
}

export interface TelegramAlert {
  id: string;
  telegramPreferenceId: string;
  name: string;
  description: string | null;
  triggerType: AlertTriggerType;
  config: AlertConfig;
  enabled: boolean;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertConfig =
  | PrioritySenderAlertConfig
  | KeywordAlertConfig
  | UnpaidInvoiceAlertConfig
  | UrgentTaskAlertConfig
  | FinanceSummaryAlertConfig
  | DigestAlertConfig;

export interface PrioritySenderAlertConfig {
  senderEmails: string[];
  senderNames?: string[];
}

export interface KeywordAlertConfig {
  keywords: string[];
  searchIn: "subject" | "body" | "both";
  caseSensitive?: boolean;
}

export interface UnpaidInvoiceAlertConfig {
  daysUntilDue?: number;
  minimumAmount?: number;
}

export interface UrgentTaskAlertConfig {
  daysOverdue?: number;
  minPriority?: Priority;
}

export interface FinanceSummaryAlertConfig {
  trackingCategories?: string[];
  thresholdAmount?: number;
}

export interface DigestAlertConfig {
  includeMetrics: ("emailCount" | "invoicesDue" | "tasksCompleted" | "financeChanges")[];
}

export interface CreateTelegramAlertInput {
  telegramPreferenceId: string;
  name: string;
  description?: string;
  triggerType: AlertTriggerType;
  config: AlertConfig;
  priority?: Priority;
}

export interface UpdateTelegramAlertInput {
  name?: string;
  description?: string;
  config?: AlertConfig;
  enabled?: boolean;
  priority?: Priority;
}

// ─────────────────────────────────────────────
// Telegram Message Types
// ─────────────────────────────────────────────

export enum MessageStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  BOUNCED = "BOUNCED",
}

export interface TelegramMessage {
  id: string;
  telegramPreferenceId: string;
  messageId: string;
  text: string;
  parseMode: string;
  sentAt: Date;
  status: MessageStatus;
  error: string | null;
  retryCount: number;
}

export interface CreateTelegramMessageInput {
  telegramPreferenceId: string;
  messageId: string;
  text: string;
  parseMode?: string;
}

// ─────────────────────────────────────────────
// Query & List Types
// ─────────────────────────────────────────────

export interface TelegramAlertFilter {
  enabled?: boolean;
  priority?: Priority;
  triggerType?: AlertTriggerType;
}

export interface TelegramMessageFilter {
  status?: MessageStatus;
  beforeDate?: Date;
  afterDate?: Date;
}

// ─────────────────────────────────────────────
// Service Result Types
// ─────────────────────────────────────────────

export interface TelegramServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendAlertResult {
  messageId: string;
  status: MessageStatus;
  error?: string;
}
