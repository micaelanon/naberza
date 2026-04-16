import type { TaskItem } from "@/lib/tasks";

export interface TaskListSectionProps {
  title: string;
  count: number;
  emptyText: string;
  tasks: TaskItem[];
  showPriorityChip?: boolean;
  onToggleTask: (taskId: string) => void;
}

export interface TaskListItemProps {
  task: TaskItem;
  showPriorityChip?: boolean;
  onToggleTask: (taskId: string) => void;
}
