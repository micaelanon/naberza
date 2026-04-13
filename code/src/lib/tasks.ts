export interface TaskItem {
  id: string;
  title: string;
  note: string;
  priority: "high" | "medium" | "low";
  kind: "persistent" | "normal";
  channel: "telegram" | "dashboard";
  dueLabel: string;
  completed: boolean;
}

export const TASKS: TaskItem[] = [
  {
    id: "renta-2026",
    title: "Hacer la declaración de la renta",
    note: "Tarea persistente. Debe recordarse cada mañana hasta marcarla como hecha.",
    priority: "high",
    kind: "persistent",
    channel: "telegram",
    dueLabel: "Cada día · 09:00",
    completed: false,
  },
  {
    id: "arnes-perro",
    title: "Comprar arnés nuevo para el perro",
    note: "Pendiente general sin recordatorio diario agresivo.",
    priority: "medium",
    kind: "normal",
    channel: "dashboard",
    dueLabel: "Sin fecha fija",
    completed: false,
  },
  {
    id: "revisar-recordatorios",
    title: "Definir canales preferidos de aviso",
    note: "Decidir si los avisos salen por Telegram, email o ambos.",
    priority: "low",
    kind: "normal",
    channel: "dashboard",
    dueLabel: "Próxima iteración",
    completed: true,
  },
];
