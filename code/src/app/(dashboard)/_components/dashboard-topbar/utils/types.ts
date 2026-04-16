import type { DashboardView, ViewMeta } from "@/types/dashboard.types";

export interface DashboardTopbarProps {
  viewMeta: ViewMeta;
  activeView: DashboardView;
  todayLabel: string;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
}
