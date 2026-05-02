export interface SessionApiResponse {
  id: string;
  status: string;
  totalFetched: number;
  totalProcessed: number;
  trashCount: number;
  archiveCount: number;
  keepCount: number;
  reviewCount: number;
  createdAt: string;
  executedAt: string | null;
}

export interface ItemApiResponse {
  id: string;
  uid: number;
  fromAddress: string;
  subject: string;
  emailDate: string;
  hasAttachments: boolean;
  effectiveDecision: string;
  aiDecision: string;
  aiReason: string | null;
  aiConfidence: number | null;
  aiCategory: string | null;
  userDecision: string | null;
  executed: boolean;
}

export interface SessionDetailResponse {
  session: SessionApiResponse;
  items: ItemApiResponse[];
}

export type ViewState = "idle" | "fetching" | "classifying" | "ready" | "executing" | "done" | "failed";

export interface GroupedItems {
  trash: ItemApiResponse[];
  archive: ItemApiResponse[];
  keep: ItemApiResponse[];
  review: ItemApiResponse[];
}

export interface TriageState {
  viewState: ViewState;
  sessionId: string | null;
  session: SessionApiResponse | null;
  items: ItemApiResponse[];
  executing: boolean;
  showConfirm: boolean;
  executeResult: { trashed: number; errors: number } | null;
  error: string | null;
  history: SessionApiResponse[];
  collapsed: Set<string>;
}
