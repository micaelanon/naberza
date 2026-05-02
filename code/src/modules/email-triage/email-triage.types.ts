export type TriageSessionStatus =
  | "PENDING"
  | "FETCHING"
  | "CLASSIFYING"
  | "READY"
  | "EXECUTING"
  | "DONE"
  | "FAILED";

export type TriageDecision = "TRASH" | "ARCHIVE" | "KEEP" | "REVIEW";

export interface TriageSessionSummary {
  id: string;
  status: TriageSessionStatus;
  totalFetched: number;
  totalProcessed: number;
  trashCount: number;
  archiveCount: number;
  keepCount: number;
  reviewCount: number;
  createdAt: Date;
  executedAt: Date | null;
}

export interface TriageItemView {
  id: string;
  uid: number;
  fromAddress: string;
  subject: string;
  emailDate: Date;
  hasAttachments: boolean;
  effectiveDecision: TriageDecision; // userDecision ?? aiDecision
  aiDecision: TriageDecision;
  aiReason: string | null;
  aiConfidence: number | null;
  aiCategory: string | null;
  userDecision: TriageDecision | null;
  executed: boolean;
}
