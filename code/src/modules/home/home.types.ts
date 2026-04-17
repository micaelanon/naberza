import type { HomeEvent, HomeSeverity } from "@prisma/client";

export type { HomeSeverity };
export type { HomeEvent };

// ─── Input types ────────────────────────────────────────────────

export interface CreateHomeEventInput {
  eventType: string;
  entityId: string;
  state?: string;
  previousState?: string;
  attributes?: Record<string, unknown>;
  sourceConnectionId: string;
  severity?: HomeSeverity;
}

export interface ListHomeEventsOptions {
  entityId?: string;
  severity?: HomeSeverity;
  acknowledged?: boolean;
  limit?: number;
  offset?: number;
}

// ─── View types ─────────────────────────────────────────────────

export interface HomeEventSummary {
  id: string;
  eventType: string;
  entityId: string;
  state: string | null;
  severity: HomeSeverity;
  acknowledgedAt: Date | null;
  createdAt: Date;
}
