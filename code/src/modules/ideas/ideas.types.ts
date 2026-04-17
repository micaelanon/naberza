import type { Idea, IdeaStatus } from "@prisma/client";

export type { IdeaStatus };
export type { Idea };

// ─── Input types ────────────────────────────────────────────────

export interface CreateIdeaInput {
  title: string;
  body?: string;
  tags?: string[];
  inboxItemId?: string;
}

export interface UpdateIdeaInput {
  title?: string;
  body?: string;
  tags?: string[];
  status?: IdeaStatus;
  promotedToModule?: string | null;
  promotedToEntityId?: string | null;
}

export interface ListIdeasOptions {
  status?: IdeaStatus;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ─── View types ─────────────────────────────────────────────────

export interface IdeaSummary {
  id: string;
  title: string;
  body: string | null;
  tags: string[];
  status: IdeaStatus;
  promotedToModule: string | null;
  createdAt: Date;
}
