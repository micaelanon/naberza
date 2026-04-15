"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/ui/shell";
import { createTask, fetchTasks, updateTaskStatus } from "@/lib/supabase-tasks";
import { isSupabaseEnabled } from "@/lib/supabase-client";
import type { TaskItem } from "@/lib/tasks";
import "./page.css";

type TaskFormState = {
  title: string;
  note: string;
  priority: TaskItem["priority"];
  kind: TaskItem["kind"];
  channel: TaskItem["channel"];
  dueLabel: string;
};

const INITIAL_FORM: TaskFormState = {
  title: "",
  note: "",
  priority: "medium",
  kind: "normal",
  channel: "dashboard",
  dueLabel: "Sin fecha fija",
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
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
            <button className="dashboard-page__nav-item dashboard-page__nav-item--active" type="button">
              <span className="dashboard-page__nav-icon">◌</span>
              <span>Hoy</span>
            </button>
            <button className="dashboard-page__nav-item" type="button">
              <span className="dashboard-page__nav-icon">○</span>
              <span>Próximamente</span>
            </button>
            <button className="dashboard-page__nav-item" type="button">
              <span className="dashboard-page__nav-icon">◐</span>
              <span>Persistentes</span>
            </button>
            <button className="dashboard-page__nav-item" type="button">
              <span className="dashboard-page__nav-icon">✓</span>
              <span>Completadas</span>
            </button>
          </nav>

          <div className="dashboard-page__sidebar-spacer" />

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
              <h2 className="dashboard-page__topbar-title">Hoy</h2>
              <p className="dashboard-page__topbar-date">{todayLabel}</p>
            </div>
            <div className="dashboard-page__topbar-actions">
              <button className="dashboard-page__icon-button" type="button">◔</button>
              <button className="dashboard-page__icon-button" type="button">⚙</button>
              <button
                className="dashboard-page__primary-button"
                type="button"
                onClick={() => {
                  setIsCreateOpen((prev) => !prev);
                  setSubmitError(null);
                }}
              >
                {isCreateOpen ? "Cerrar" : "Añadir tarea"}
              </button>
            </div>
          </header>

          <div className="dashboard-page__content">
            {isCreateOpen && (
              <section className="dashboard-page__create-panel">
                <div className="dashboard-page__section-heading">
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
                        onChange={(event) =>
                          handleFormChange("priority", event.target.value as TaskItem["priority"])
                        }
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
                        onChange={(event) =>
                          handleFormChange("kind", event.target.value as TaskItem["kind"])
                        }
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
                        onChange={(event) =>
                          handleFormChange("channel", event.target.value as TaskItem["channel"])
                        }
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

            <section className="dashboard-page__section">
              <div className="dashboard-page__section-heading">
                <span className="dashboard-page__section-kicker">Recordatorios persistentes</span>
                <div className="dashboard-page__section-line" />
              </div>

              {loading ? (
                <p className="dashboard-page__empty-copy">Cargando tareas...</p>
              ) : persistentTasks.length === 0 ? (
                <p className="dashboard-page__empty-copy">No hay recordatorios persistentes pendientes.</p>
              ) : (
                <div className="dashboard-page__persistent-grid">
                  {persistentTasks.map((task) => (
                    <article className="dashboard-page__persistent-card" key={task.id}>
                      <div className="dashboard-page__persistent-topline">
                        <button
                          className="dashboard-page__persistent-refresh"
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
                        >
                          ↻
                        </button>
                        <span className="dashboard-page__persistent-tag">
                          {task.priority === "high"
                            ? "Prioridad alta"
                            : task.priority === "medium"
                              ? "Seguimiento"
                              : "Rutina"}
                        </span>
                      </div>
                      <div className="dashboard-page__persistent-body">
                        <h3 className="dashboard-page__persistent-title">{task.title}</h3>
                        <p className="dashboard-page__persistent-copy">{task.dueLabel} • {task.note || "Sin nota adicional."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-page__section">
              <div className="dashboard-page__todo-header">
                <h4 className="dashboard-page__todo-title">Pendientes</h4>
                <span className="dashboard-page__todo-badge">{normalTasks.length} TAREAS</span>
              </div>

              {loading ? (
                <p className="dashboard-page__empty-copy">Cargando tareas...</p>
              ) : normalTasks.length === 0 ? (
                <p className="dashboard-page__empty-copy">No hay tareas pendientes normales.</p>
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
                      />
                      <div className="dashboard-page__todo-main">
                        <div className="dashboard-page__todo-title-row">
                          <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                          <span className="dashboard-page__todo-time">{task.dueLabel}</span>
                        </div>
                        <p className="dashboard-page__todo-copy">{task.note || "Sin nota adicional."}</p>
                      </div>
                      <div className="dashboard-page__todo-side">
                        <span className="dashboard-page__todo-chip">{task.channel === "dashboard" ? "Dashboard" : "Telegram"}</span>
                        <span className="dashboard-page__todo-drag">⋮⋮</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-page__image-panel">
              <div className="dashboard-page__image-overlay" />
              <p className="dashboard-page__image-caption">Respira. Piensa. Actúa.</p>
            </section>
          </div>
        </section>
      </main>
    </Shell>
  );
}
