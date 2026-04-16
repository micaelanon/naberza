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
    id: "vacuna-perro",
    title: "Pedir cita para la vacuna del perro",
    note: "Confirmar disponibilidad del veterinario y cerrar la fecha esta semana.",
    priority: "high",
    kind: "persistent",
    channel: "telegram",
    dueLabel: "Cada día · 09:30",
    completed: false,
  },
  {
    id: "renta-2026",
    title: "Revisar borrador de la renta",
    note: "Comprobar si falta algo antes de presentarla.",
    priority: "high",
    kind: "persistent",
    channel: "dashboard",
    dueLabel: "Cada día · 08:30",
    completed: false,
  },
  {
    id: "taller-coche",
    title: "Llamar al taller por la revisión del coche",
    note: "Ver huecos disponibles y coste aproximado.",
    priority: "medium",
    kind: "normal",
    channel: "dashboard",
    dueLabel: "Mañana · 11:00",
    completed: false,
  },
  {
    id: "compra-casa",
    title: "Comprar bombillas para el salón",
    note: "Mirar si siguen siendo E27 antes de salir.",
    priority: "low",
    kind: "normal",
    channel: "dashboard",
    dueLabel: "Sin fecha fija",
    completed: false,
  },
  {
    id: "medico-llamada",
    title: "Confirmar cita médica",
    note: "Revisar si llegó la confirmación o llamar al centro.",
    priority: "medium",
    kind: "normal",
    channel: "telegram",
    dueLabel: "Viernes · 10:00",
    completed: false,
  },
  {
    id: "definir-canales",
    title: "Definir canales preferidos de aviso",
    note: "Decidir si los avisos salen por Telegram, email o ambos.",
    priority: "low",
    kind: "normal",
    channel: "dashboard",
    dueLabel: "Próxima iteración",
    completed: true,
  },
];
