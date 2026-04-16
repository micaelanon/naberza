import type { DashboardView, TaskCollections, ViewMeta } from "@/types/dashboard.types";
import type { TaskItem } from "@/lib/tasks";

export const NAV_ITEMS = [
  { key: "today" as DashboardView, label: "Hoy", icon: "calendar_today" },
  { key: "upcoming" as DashboardView, label: "Próximamente", icon: "event_upcoming" },
  { key: "persistent" as DashboardView, label: "Persistentes", icon: "push_pin" },
  { key: "completed" as DashboardView, label: "Completadas", icon: "task_alt" },
];

export const VIEW_META: Record<DashboardView, ViewMeta> = {
  today: {
    title: "Hoy",
    description: "Tu tablero de trabajo inmediato.",
    empty: "No hay tareas pendientes para hoy.",
  },
  upcoming: {
    title: "Próximamente",
    description: "Lo siguiente que no conviene perder de vista.",
    empty: "No hay tareas próximas ahora mismo.",
  },
  persistent: {
    title: "Persistentes",
    description: "Recordatorios que siguen vivos hasta resolverlos.",
    empty: "No hay recordatorios persistentes pendientes.",
  },
  completed: {
    title: "Completadas",
    description: "Lo que ya quedó hecho.",
    empty: "Aún no hay tareas completadas.",
  },
};

export const INITIAL_FORM = {
  title: "",
  note: "",
  priority: "medium" as TaskItem["priority"],
  kind: "normal" as TaskItem["kind"],
  channel: "dashboard" as TaskItem["channel"],
  dueLabel: "Sin fecha fija",
};

export function isUpcomingTask(task: TaskItem): boolean {
  const normalized = task.dueLabel.toLowerCase();
  return !task.completed && task.dueLabel !== "Sin fecha fija" && !normalized.includes("cada día");
}

export function getTaskCollections(tasks: TaskItem[]): TaskCollections {
  const pending = tasks.filter((t) => !t.completed);
  return {
    pending,
    persistent: pending.filter((t) => t.kind === "persistent"),
    normal: pending.filter((t) => t.kind === "normal"),
    completed: tasks.filter((t) => t.completed),
    upcoming: pending.filter(isUpcomingTask),
  };
}

export function getActiveTasks(view: DashboardView, collections: TaskCollections): TaskItem[] {
  if (view === "upcoming") return collections.upcoming;
  if (view === "persistent") return collections.persistent;
  if (view === "completed") return collections.completed;
  return collections.pending;
}

export function formatTodayLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}
