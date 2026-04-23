// ─────────────────────────────────────────────
// Email Cleanup Rule Types
// ─────────────────────────────────────────────

export enum CleanupMatchType {
  SENDER = "SENDER",
  KEYWORD = "KEYWORD",
  NEWSLETTER = "NEWSLETTER",
  OLD_EMAILS = "OLD_EMAILS",
  SIZE_THRESHOLD = "SIZE_THRESHOLD",
  READ_STATUS = "READ_STATUS",
  CUSTOM = "CUSTOM",
}

export enum CleanupAction {
  DELETE = "DELETE",
  ARCHIVE = "ARCHIVE",
  LABEL = "LABEL",
  MOVE_TO_FOLDER = "MOVE_TO_FOLDER",
}

export interface EmailCleanupRule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  matchType: CleanupMatchType;
  config: CleanupRuleConfig;
  action: CleanupAction;
  enabled: boolean;
  priority: number;
  dryRunEnabled: boolean;
  lastExecutedAt: Date | null;
  matchedCount: number;
  executedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CleanupRuleConfig =
  | SenderConfig
  | KeywordConfig
  | NewsletterConfig
  | OldEmailsConfig
  | SizeThresholdConfig
  | ReadStatusConfig
  | CustomConfig;

export interface SenderConfig {
  senderEmails: string[];
  matchType?: "exact" | "domain";
}

export interface KeywordConfig {
  keywords: string[];
  searchIn: "subject" | "body" | "both";
  matchAll?: boolean;
  caseSensitive?: boolean;
}

export interface NewsletterConfig {
  listUnsubscribePattern?: string;
  marketingKeywords?: string[];
}

export interface OldEmailsConfig {
  ageInDays: number;
  beforeDate?: Date;
}

export interface SizeThresholdConfig {
  minSizeKB?: number;
  maxSizeKB?: number;
}

export interface ReadStatusConfig {
  readStatus: "read" | "unread" | "any";
}

export interface CustomConfig {
  [key: string]: any;
}

export interface CreateCleanupRuleInput {
  name: string;
  description?: string;
  matchType: CleanupMatchType;
  config: CleanupRuleConfig;
  action: CleanupAction;
  priority?: number;
  dryRunEnabled?: boolean;
}

export interface UpdateCleanupRuleInput {
  name?: string;
  description?: string;
  config?: CleanupRuleConfig;
  action?: CleanupAction;
  enabled?: boolean;
  priority?: number;
  dryRunEnabled?: boolean;
}

// ─────────────────────────────────────────────
// Cleanup Execution Types
// ─────────────────────────────────────────────

export interface CleanupMatch {
  inboxItemId: string; // For IMAP: messageId; for DB: inboxItemId
  title: string;
  senderEmail?: string;
  date: Date;
  preview?: string;
  matchedAt: Date;
  // For IMAP operations, store the UID needed for deletion/archiving
  imapMetadata?: {
    uid: number;
    connectionId: string;
    messageId: string;
  };
}

export interface CleanupPreviewResult {
  ruleId: string;
  ruleName: string;
  totalMatches: number;
  matches: CleanupMatch[];
  estimatedEffect: string;
}

export interface CleanupExecutionResult {
  ruleId: string;
  ruleName: string;
  action: CleanupAction;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  executedAt: Date;
}

export interface EmailCleanupLog {
  id: string;
  ruleId: string;
  inboxItemId: string;
  action: CleanupAction;
  wasPreview: boolean;
  executedAt: Date;
}

// ─────────────────────────────────────────────
// Filter & List Types
// ─────────────────────────────────────────────

export interface CleanupRuleFilter {
  enabled?: boolean;
  matchType?: CleanupMatchType;
  action?: CleanupAction;
}

export interface CleanupLogFilter {
  action?: CleanupAction;
  beforeDate?: Date;
  afterDate?: Date;
}

// ─────────────────────────────────────────────
// Service Result Types
// ─────────────────────────────────────────────

export interface CleanupServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
