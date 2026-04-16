import type { TaskItem } from "@/lib/tasks";

export type DashboardView = "today" | "upcoming" | "persistent" | "completed";

export interface NavItem {
  key: DashboardView;
  label: string;
  icon: string;
}

export interface ViewMeta {
  title: string;
  description: string;
  empty: string;
}

export interface TaskCollections {
  pending: TaskItem[];
  persistent: TaskItem[];
  normal: TaskItem[];
  completed: TaskItem[];
  upcoming: TaskItem[];
}

export interface TaskFormState {
  title: string;
  note: string;
  priority: TaskItem["priority"];
  kind: TaskItem["kind"];
  channel: TaskItem["channel"];
  dueLabel: string;
}
