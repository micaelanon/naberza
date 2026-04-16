import type { TaskItem } from "@/lib/tasks";

export function getPriorityLabel(priority: TaskItem["priority"]): string {
  if (priority === "high") return "Prioridad";
  if (priority === "medium") return "Seguimiento";
  return "Rutina";
}
