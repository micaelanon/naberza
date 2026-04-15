"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/ui/shell";
import { isSupabaseEnabled } from "@/lib/supabase-client";
import { fetchTasks, updateTaskStatus, createTask } from "@/lib/supabase-tasks";
import type { TaskItem } from "@/lib/tasks";
import "./page.css";

type DashboardView = "today" | "upcoming" | "persistent" | "completed";

type NavItem = {
  key: DashboardView;
  label: string;
  icon: string;
};

type TaskFormState = {
  title: string;
  note: string;
  priority: TaskItem["priority"];
  kind: TaskItem["kind"];
  channel: TaskItem["channel"];
  dueLabel: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "Hoy", icon: "calendar_today" },
  { key: "upcoming", label: "Próximamente", icon: "event_upcoming" },
  { key: "persistent", label: "Persistentes", icon: "push_pin" },
  { key: "completed", label: "Completadas", icon: "task_alt" },
];

const INITIAL_FORM: TaskFormState = {
  title: "",
  note: "",
  priority: "medium",
  kind: "normal",
  channel: "dashboard",
  dueLabel: "Sin fecha fija",
};

function isUpcomingTask(task: TaskItem) {
  return !task.completed && task.dueLabel !== "Sin fecha fija" && !task.dueLabel.toLowerCase().includes("cada día");
}

function getViewMeta(view: DashboardView) {
  switch (view) {
    case "upcoming":
      return {
        title: "Próximamente",
        description: "Lo siguiente que no conviene perder de vista.",
        empty: "No hay tareas próximas ahora mismo.",
      };
    case "persistent":
      return {
        title: "Persistentes",
        description: "Recordatorios que siguen vivos hasta resolverlos.",
        empty: "No hay recordatorios persistentes pendientes.",
      };
    case "completed":
      return {
        title: "Completadas",
        description: "Lo que ya quedó hecho.",
        empty: "Aún no hay tareas completadas.",
      };
    case "today":
    default:
      return {
        title: "Hoy",
        description: "Tu tablero de trabajo inmediato.",
        empty: "No hay tareas pendientes para hoy.",
      };
  }
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>("today");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks();
        setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: newCompleted } : t
      )
    );

    const success = await updateTaskStatus(taskId, newCompleted);
    if (!success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: task.completed } : t
        )
      );
    }
  };

  const handleFormChange = <K extends keyof TaskFormState>(
    field: K,
    value: TaskFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSubmitError(null);
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const note = form.note.trim();
    const dueLabel = form.dueLabel.trim();

    if (!title) {
      setSubmitError("El título es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const createdTask = await createTask({
      title,
      note,
      priority: form.priority,
      kind: form.kind,
      channel: form.channel,
      dueLabel: dueLabel || "Sin fecha fija",
      completed: false,
    });

    if (!createdTask) {
      setSubmitError("No se pudo crear la tarea.");
      setIsSubmitting(false);
      return;
    }

    setTasks((prev) => [createdTask, ...prev]);
    resetForm();
    setIsCreateOpen(false);
    setIsSubmitting(false);
  };

  const pendingTasks = tasks.filter((task) => !task.completed);
  const persistentTasks = pendingTasks.filter((task) => task.kind === "persistent");
  const normalTasks = pendingTasks.filter((task) => task.kind === "normal");
  const completedTasks = tasks.filter((task) => task.completed);
  const upcomingTasks = pendingTasks.filter(isUpcomingTask);

  const viewMeta = getViewMeta(activeView);

  const activeTasks = (() => {
    switch (activeView) {
      case "upcoming":
        return upcomingTasks;
      case "persistent":
        return persistentTasks;
      case "completed":
        return completedTasks;
      case "today":
      default:
        return pendingTasks;
    }
  })();

  const showPersistentRail = activeView === "today" && persistentTasks.length > 0;
  const showPendingList = activeView === "today";

  return (
    <Shell>
      <main className="dashboard-page">
        <aside className="dashboard-page__sidebar">
          <div className="dashboard-page__brand-block">
            <h1 className="dashboard-page__brand">naBerza</h1>
            <p className="dashboard-page__brand-subtitle">Tu refugio tranquilo</p>
            <p className="dashboard-page__brand-meta">
              {isSupabaseEnabled ? "Supabase activo" : "Modo local"}
            </p>
          </div>

          <nav className="dashboard-page__nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`dashboard-page__nav-item ${activeView === item.key ? "dashboard-page__nav-item--active" : ""}`.trim()}
                type="button"
                onClick={() => setActiveView(item.key)}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="dashboard-page__profile">
            <div className="dashboard-page__avatar" />
            <div>
              <p className="dashboard-page__profile-name">Panel personal</p>
              <p className="dashboard-page__profile-meta">Base operativa v1</p>
            </div>
          </div>
        </aside>

        <section className="dashboard-page__canvas">
          <header className="dashboard-page__topbar">
            <div>
              <h2 className="dashboard-page__topbar-title">{viewMeta.title}</h2>
              <p className="dashboard-page__topbar-date">{activeView === "today" ? todayLabel : viewMeta.description}</p>
            </div>
            <div className="dashboard-page__topbar-actions">
              <div className="dashboard-page__icon-buttons">
                <button className="dashboard-page__icon-button material-symbols-outlined" type="button">notifications</button>
                <button className="dashboard-page__icon-button material-symbols-outlined" type="button">settings</button>
              </div>
              <button
                className="dashboard-page__primary-button"
                type="button"
                onClick={() => {
                  setIsCreateOpen((prev) => !prev);
                  setSubmitError(null);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
                <span>{isCreateOpen ? "Cerrar" : "Añadir tarea"}</span>
              </button>
            </div>
          </header>

          <div className="dashboard-page__content">
            {isCreateOpen && (
              <section className="dashboard-page__create-panel">
                <div className="dashboard-page__section-header">
                  <span className="dashboard-page__section-kicker">Nueva tarea</span>
                  <div className="dashboard-page__section-line" />
                </div>

                <form className="dashboard-page__create-form" onSubmit={handleCreateTask}>
                  <div className="dashboard-page__form-grid">
                    <label className="dashboard-page__field dashboard-page__field--full">
                      <span className="dashboard-page__field-label">Título</span>
                      <input
                        value={form.title}
                        onChange={(event) => handleFormChange("title", event.target.value)}
                        className="dashboard-page__input"
                        type="text"
                        placeholder="Ej. Llamar al taller"
                        required
                      />
                    </label>

                    <label className="dashboard-page__field dashboard-page__field--full">
                      <span className="dashboard-page__field-label">Nota</span>
                      <textarea
                        value={form.note}
                        onChange={(event) => handleFormChange("note", event.target.value)}
                        className="dashboard-page__textarea"
                        rows={3}
                        placeholder="Contexto breve para no perder el hilo"
                      />
                    </label>

                    <label className="dashboard-page__field">
                      <span className="dashboard-page__field-label">Prioridad</span>
                      <select
                        value={form.priority}
                        onChange={(event) => handleFormChange("priority", event.target.value as TaskItem["priority"])}
                        className="dashboard-page__select"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </label>

                    <label className="dashboard-page__field">
                      <span className="dashboard-page__field-label">Tipo</span>
                      <select
                        value={form.kind}
                        onChange={(event) => handleFormChange("kind", event.target.value as TaskItem["kind"])}
                        className="dashboard-page__select"
                      >
                        <option value="normal">Normal</option>
                        <option value="persistent">Persistente</option>
                      </select>
                    </label>

                    <label className="dashboard-page__field">
                      <span className="dashboard-page__field-label">Canal</span>
                      <select
                        value={form.channel}
                        onChange={(event) => handleFormChange("channel", event.target.value as TaskItem["channel"])}
                        className="dashboard-page__select"
                      >
                        <option value="dashboard">Dashboard</option>
                        <option value="telegram">Telegram</option>
                      </select>
                    </label>

                    <label className="dashboard-page__field">
                      <span className="dashboard-page__field-label">Etiqueta de fecha</span>
                      <input
                        value={form.dueLabel}
                        onChange={(event) => handleFormChange("dueLabel", event.target.value)}
                        className="dashboard-page__input"
                        type="text"
                        placeholder="Ej. Mañana · 09:00"
                      />
                    </label>
                  </div>

                  {submitError && <p className="dashboard-page__form-error">{submitError}</p>}

                  <div className="dashboard-page__form-actions">
                    <button
                      className="dashboard-page__secondary-button"
                      type="button"
                      onClick={() => {
                        resetForm();
                        setIsCreateOpen(false);
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="dashboard-page__primary-button" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Guardando..." : "Crear tarea"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {loading ? (
              <p className="dashboard-page__empty-state">Cargando tareas...</p>
            ) : (
              <>
                {showPersistentRail && (
                  <section className="dashboard-page__section">
                    <div className="dashboard-page__section-header">
                      <span className="dashboard-page__section-kicker">Recordatorios persistentes</span>
                      <div className="dashboard-page__section-line" />
                    </div>

                    <div className="dashboard-page__persistent-grid">
                      {persistentTasks.map((task) => (
                        <article className="dashboard-page__persistent-card" key={task.id}>
                          <div className="dashboard-page__persistent-top">
                            <button
                              className="dashboard-page__persistent-refresh"
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
                            >
                              ↻
                            </button>
                            <span className="dashboard-page__persistent-tag">
                              {task.priority === "high" ? "Prioridad" : task.priority === "medium" ? "Seguimiento" : "Rutina"}
                            </span>
                          </div>
                          <div className="dashboard-page__persistent-info">
                            <h3 className="dashboard-page__persistent-title">{task.title}</h3>
                            <p className="dashboard-page__persistent-desc">{task.dueLabel} • {task.note || "Sin nota adicional."}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {showPendingList ? (
                  <section className="dashboard-page__section">
                    <div className="dashboard-page__todo-header">
                      <h4 className="dashboard-page__todo-title">Pendientes</h4>
                      <span className="dashboard-page__todo-badge">{normalTasks.length} TAREAS</span>
                    </div>

                    {normalTasks.length === 0 ? (
                      <p className="dashboard-page__empty-state">No hay tareas normales pendientes.</p>
                    ) : (
                      <div className="dashboard-page__todo-list">
                        {normalTasks.map((task) => (
                          <article className="dashboard-page__todo-item" key={task.id}>
                            <button
                              className="dashboard-page__todo-check"
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
                              aria-label={`${task.completed ? "Reabrir" : "Completar"}: ${task.title}`}
                            >
                              <div className="dashboard-page__todo-check-inner" />
                            </button>
                            <div className="dashboard-page__todo-main">
                              <div className="dashboard-page__todo-main-top">
                                <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                                <span className="dashboard-page__todo-due-label">{task.dueLabel}</span>
                              </div>
                              <p className="dashboard-page__todo-desc">{task.note || "Sin nota adicional."}</p>
                            </div>
                            <div className="dashboard-page__todo-side dashboard-page__todo-side--visible">
                              <span className="dashboard-page__todo-chip">{task.channel === "dashboard" ? "Personal" : "Telegram"}</span>
                              <span className="material-symbols-outlined dashboard-page__todo-drag">drag_indicator</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="dashboard-page__section">
                    <div className="dashboard-page__todo-header">
                      <h4 className="dashboard-page__todo-title">{viewMeta.title}</h4>
                      <span className="dashboard-page__todo-badge">{activeTasks.length} TAREAS</span>
                    </div>

                    {activeTasks.length === 0 ? (
                      <p className="dashboard-page__empty-state">{viewMeta.empty}</p>
                    ) : (
                      <div className="dashboard-page__todo-list">
                        {activeTasks.map((task) => (
                          <article className={`dashboard-page__todo-item ${task.completed ? "dashboard-page__todo-item--completed" : ""}`.trim()} key={task.id}>
                            <button
                              className="dashboard-page__todo-check"
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
                              aria-label={`${task.completed ? "Reabrir" : "Completar"}: ${task.title}`}
                            >
                              <div className="dashboard-page__todo-check-inner" />
                            </button>
                            <div className="dashboard-page__todo-main">
                              <div className="dashboard-page__todo-main-top">
                                <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                                <span className="dashboard-page__todo-due-label">{task.dueLabel}</span>
                              </div>
                              <p className="dashboard-page__todo-desc">{task.note || "Sin nota adicional."}</p>
                            </div>
                            <div className="dashboard-page__todo-side dashboard-page__todo-side--visible">
                              <span className="dashboard-page__todo-chip">{task.kind === "persistent" ? "Persistente" : task.channel === "dashboard" ? "Personal" : "Telegram"}</span>
                              <span className="dashboard-page__todo-chip dashboard-page__todo-chip--subtle">{task.priority}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </Shell>
  );
}
