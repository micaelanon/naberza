import type { DashboardView, NavItem } from "@/types/dashboard.types";

export interface DashboardSidebarProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "Hoy", icon: "calendar_today" },
  { key: "upcoming", label: "Próximamente", icon: "event_upcoming" },
  { key: "persistent", label: "Persistentes", icon: "push_pin" },
  { key: "completed", label: "Completadas", icon: "task_alt" },
];
