export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskKind = "NORMAL" | "PERSISTENT" | "RECURRING";
export type Priority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  kind: TaskKind;
  status: TaskStatus;
  dueAt: Date | null;
  recurrenceRule: string | null;
  tags: string[];
  inboxItemId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: Priority;
  kind?: TaskKind;
  dueAt?: Date;
  recurrenceRule?: string;
  tags?: string[];
  inboxItemId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: Priority;
  kind?: TaskKind;
  status?: TaskStatus;
  dueAt?: Date;
  recurrenceRule?: string;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus;
  kind?: TaskKind;
  priority?: Priority;
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface TaskListResult {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}
