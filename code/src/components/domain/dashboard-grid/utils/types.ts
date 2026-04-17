import type { DashboardTile } from "@/lib/dashboard";

export interface DashboardGridProps {
  tiles: DashboardTile[];
  variant?: "primary" | "secondary";
}
