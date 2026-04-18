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
  documentsTotal: number;
  invoicesUnpaid: number;
  homeAlerts: number;
  ideasCaptured: number;
  approvalsPending: number;
  financeAnomalies: number;
}

export interface DashboardLayout {
  primary: DashboardTile[];
  secondary: DashboardTile[];
}
