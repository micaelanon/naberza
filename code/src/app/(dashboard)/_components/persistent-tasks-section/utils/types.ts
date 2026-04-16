import type { TaskItem } from "@/lib/tasks";

export interface PersistentTasksSectionProps {
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
}
