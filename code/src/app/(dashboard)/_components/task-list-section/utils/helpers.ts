import type { TaskItem } from "@/lib/tasks";

export function getChannelLabel(channel: TaskItem["channel"]): string {
  return channel === "dashboard" ? "Personal" : "Telegram";
}

export function getListChipLabel(task: TaskItem): string {
  if (task.kind === "persistent") return "Persistente";
  return getChannelLabel(task.channel);
}

export function getPriorityLabel(priority: TaskItem["priority"]): string {
  if (priority === "high") return "Prioridad";
  if (priority === "medium") return "Seguimiento";
  return "Rutina";
}
