import type { HomeEventSummary, HomeLiveEntitySummary, HomeLiveOverview } from "@/modules/home";
import type { ReactNode } from "react";

export interface HomeLiveResponse {
  configured: boolean;
  connected: boolean | null;
  error?: string;
  overview: HomeLiveOverview;
}

export interface HomeViewPayload {
  events: HomeEventSummary[];
  total: number;
  live: HomeLiveResponse;
}

export interface HomeLiveListProps {
  items: HomeLiveEntitySummary[];
  empty: string;
}

export interface HomeLiveStatus {
  className: string;
  text: string;
}

export interface HomeSummaryCardsProps {
  live: HomeLiveResponse;
  total: number;
}

export interface HomeLiveSectionProps {
  title: string;
  subtitle: string;
  count: number;
  items: HomeLiveEntitySummary[];
  empty: string;
}

export interface HomeEventsSectionProps {
  events: HomeEventSummary[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

export interface UseHomeViewDataResult {
  events: HomeEventSummary[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  live: HomeLiveResponse;
  handleRefresh: () => Promise<void>;
}

export interface HomeViewSectionComponentProps {
  children: ReactNode;
}
