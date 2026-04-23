import type { ReactNode } from "react";

import type { Priority, Task, TaskKind, TaskStatus } from "@/modules/tasks/task.types";

export type StatusTab = "ALL" | TaskStatus;

export interface StatusTabOption {
  value: StatusTab;
  label: string;
}

export interface TasksApiResponse {
  data: Task[];
  meta: { total: number; page: number; pageSize: number };
}

export interface TaskFormState {
  title: string;
  description: string;
  priority: Priority;
  kind: TaskKind;
  dueAt: string;
  tags: string;
}

export interface TaskFormFieldsProps {
  form: TaskFormState;
  onChange: (patch: Partial<TaskFormState>) => void;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onCancel: () => void;
}

export interface TaskCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export interface TaskEditFormProps {
  task: Task;
  onSaved: () => void;
  onCancel: () => void;
}

export interface TaskItemActionsProps {
  task: Task;
  isActive: boolean;
  onEdit: () => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: () => void;
}

export interface TaskListItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
}

export interface TasksContentProps {
  isLoading: boolean;
  error: string | null;
  tasks: Task[];
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
  hasActiveFilters: boolean;
}

export type TasksViewComponent = () => ReactNode;
