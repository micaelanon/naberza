export interface DashboardTile {
  id: string;
  label: string;
  count: number;
  icon: string;
  href: string;
  color?: string;
}

export interface DashboardStats {
  inboxPending: number;
  tasksPending: number;
  tasksDueToday: number;
  documentsRecent: number;
  invoicesUnpaid: number;
  homeAlerts: number;
}

export interface DashboardLayout {
  primary: DashboardTile[];
  secondary: DashboardTile[];
}
