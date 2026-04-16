export type InboxSourceType = "EMAIL" | "PAPERLESS" | "HOME_ASSISTANT" | "MANUAL" | "API";

export type InboxStatus = "PENDING" | "CLASSIFIED" | "ROUTED" | "DISMISSED" | "FAILED";

export type InboxClassification =
  | "TASK"
  | "DOCUMENT"
  | "INVOICE"
  | "EVENT"
  | "ALERT"
  | "IDEA"
  | "FINANCIAL"
  | "REVIEW";

export type ClassifiedBy = "RULE" | "AI_SUGGESTION" | "MANUAL";

export type Priority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface InboxItem {
  id: string;
  title: string;
  body: string | null;
  sourceType: InboxSourceType;
  sourceConnectionId: string | null;
  sourceExternalId: string | null;
  sourceRawPayload: Record<string, unknown> | null;
  classification: InboxClassification | null;
  classifiedBy: ClassifiedBy | null;
  classificationConfidence: number | null;
  status: InboxStatus;
  routedToModule: string | null;
  routedToEntityId: string | null;
  priority: Priority;
  metadata: Record<string, unknown> | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInboxItemDto {
  title: string;
  body?: string;
  sourceType: InboxSourceType;
  sourceConnectionId?: string;
  sourceExternalId?: string;
  sourceRawPayload?: Record<string, unknown>;
  priority?: Priority;
  metadata?: Record<string, unknown>;
}

export interface UpdateInboxItemDto {
  title?: string;
  body?: string;
  classification?: InboxClassification;
  classifiedBy?: ClassifiedBy;
  classificationConfidence?: number;
  status?: InboxStatus;
  routedToModule?: string;
  routedToEntityId?: string;
  priority?: Priority;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
}

export interface InboxFilters {
  status?: InboxStatus;
  sourceType?: InboxSourceType;
  classification?: InboxClassification;
  priority?: Priority;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface InboxListResult {
  items: InboxItem[];
  total: number;
  page: number;
  pageSize: number;
}
