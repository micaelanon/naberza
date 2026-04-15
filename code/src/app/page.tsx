"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/ui/shell";
import { isSupabaseEnabled } from "@/lib/supabase-client";
import { createTask, fetchTasks, updateTaskStatus } from "@/lib/supabase-tasks";
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

type ViewMeta = {
  title: string;
  description: string;
  empty: string;
};

type TaskCollections = {
  pending: TaskItem[];
  persistent: TaskItem[];
  normal: TaskItem[];
  completed: TaskItem[];
  upcoming: TaskItem[];
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

const VIEW_META: Record<DashboardView, ViewMeta> = {
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

function isUpcomingTask(task: TaskItem) {
  const normalizedDueLabel = task.dueLabel.toLowerCase();
  return !task.completed && task.dueLabel !== "Sin fecha fija" && !normalizedDueLabel.includes("cada día");
}

function getTaskCollections(tasks: TaskItem[]): TaskCollections {
  const pending = tasks.filter((task) => !task.completed);
  return {
    pending,
    persistent: pending.filter((task) => task.kind === "persistent"),
    normal: pending.filter((task) => task.kind === "normal"),
    completed: tasks.filter((task) => task.completed),
    upcoming: pending.filter(isUpcomingTask),
  };
}

function getActiveTasks(view: DashboardView, collections: TaskCollections): TaskItem[] {
  if (view === "upcoming") return collections.upcoming;
  if (view === "persistent") return collections.persistent;
  if (view === "completed") return collections.completed;
  return collections.pending;
}

function getPriorityLabel(priority: TaskItem["priority"]) {
  if (priority === "high") return "Prioridad";
  if (priority === "medium") return "Seguimiento";
  return "Rutina";
}

function getChannelLabel(channel: TaskItem["channel"]) {
  return channel === "dashboard" ? "Personal" : "Telegram";
}

function getListChipLabel(task: TaskItem) {
  if (task.kind === "persistent") return "Persistente";
  return getChannelLabel(task.channel);
}

function getTaskDescription(task: TaskItem) {
  return task.note || "Sin nota adicional.";
}

function getTaskActionLabel(task: TaskItem) {
  return task.completed ? "Reabrir tarea" : "Marcar como hecha";
}

function getTaskAriaLabel(task: TaskItem) {
  const prefix = task.completed ? "Reabrir" : "Completar";
  return `${prefix}: ${task.title}`;
}

function DashboardSidebar({
  activeView,
  onSelectView,
}: {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
}) {
  return (
    <aside className="dashboard-page__sidebar">
      <div className="dashboard-page__brand-block">
        <h1 className="dashboard-page__brand">naBerza</h1>
        <p className="dashboard-page__brand-subtitle">Tu refugio tranquilo</p>
        <p className="dashboard-page__brand-meta">
          {isSupabaseEnabled ? "Supabase activo" : "Modo local"}
        </p>
      </div>

      <nav className="dashboard-page__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          const className = [
            "dashboard-page__nav-item",
            isActive ? "dashboard-page__nav-item--active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={item.key}
              className={className}
              type="button"
              onClick={() => onSelectView(item.key)}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="dashboard-page__profile">
        <div className="dashboard-page__avatar" />
        <div>
          <p className="dashboard-page__profile-name">Panel personal</p>
          <p className="dashboard-page__profile-meta">Base operativa v1</p>
        </div>
      </div>
    </aside>
  );
}

function DashboardTopbar({
  viewMeta,
  activeView,
  todayLabel,
  isCreateOpen,
  onToggleCreate,
}: {
  viewMeta: ViewMeta;
  activeView: DashboardView;
  todayLabel: string;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
}) {
  const subtitle = activeView === "today" ? todayLabel : viewMeta.description;

  return (
    <header className="dashboard-page__topbar">
      <div>
        <h2 className="dashboard-page__topbar-title">{viewMeta.title}</h2>
        <p className="dashboard-page__topbar-date">{subtitle}</p>
      </div>
      <div className="dashboard-page__topbar-actions">
        <div className="dashboard-page__icon-buttons">
          <button className="dashboard-page__icon-button material-symbols-outlined" type="button">notifications</button>
          <button className="dashboard-page__icon-button material-symbols-outlined" type="button">settings</button>
        </div>
        <button className="dashboard-page__primary-button" type="button" onClick={onToggleCreate}>
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
          <span>{isCreateOpen ? "Cerrar" : "Añadir tarea"}</span>
        </button>
      </div>
    </header>
  );
}

function CreateTaskPanel({
  form,
  submitError,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: TaskFormState;
  submitError: string | null;
  isSubmitting: boolean;
  onChange: <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <section className="dashboard-page__create-panel">
      <div className="dashboard-page__section-header">
        <span className="dashboard-page__section-kicker">Nueva tarea</span>
        <div className="dashboard-page__section-line" />
      </div>

      <form className="dashboard-page__create-form" onSubmit={onSubmit}>
        <div className="dashboard-page__form-grid">
          <label className="dashboard-page__field dashboard-page__field--full">
            <span className="dashboard-page__field-label">Título</span>
            <input
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
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
              onChange={(event) => onChange("note", event.target.value)}
              className="dashboard-page__textarea"
              rows={3}
              placeholder="Contexto breve para no perder el hilo"
            />
          </label>

          <label className="dashboard-page__field">
            <span className="dashboard-page__field-label">Prioridad</span>
            <select
              value={form.priority}
              onChange={(event) => onChange("priority", event.target.value as TaskItem["priority"])}
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
              onChange={(event) => onChange("kind", event.target.value as TaskItem["kind"])}
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
              onChange={(event) => onChange("channel", event.target.value as TaskItem["channel"])}
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
              onChange={(event) => onChange("dueLabel", event.target.value)}
              className="dashboard-page__input"
              type="text"
              placeholder="Ej. Mañana · 09:00"
            />
          </label>
        </div>

        {submitError && <p className="dashboard-page__form-error">{submitError}</p>}

        <div className="dashboard-page__form-actions">
          <button className="dashboard-page__secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="dashboard-page__primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear tarea"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PersistentTasksSection({
  tasks,
  onToggleTask,
}: {
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
}) {
  return (
    <section className="dashboard-page__section">
      <div className="dashboard-page__section-header">
        <span className="dashboard-page__section-kicker">Recordatorios persistentes</span>
        <div className="dashboard-page__section-line" />
      </div>

      <div className="dashboard-page__persistent-grid">
        {tasks.map((task) => (
          <article className="dashboard-page__persistent-card" key={task.id}>
            <div className="dashboard-page__persistent-top">
              <button
                className="dashboard-page__persistent-refresh"
                type="button"
                onClick={() => onToggleTask(task.id)}
                title={getTaskActionLabel(task)}
              >
                ↻
              </button>
              <span className="dashboard-page__persistent-tag">{getPriorityLabel(task.priority)}</span>
            </div>
            <div className="dashboard-page__persistent-info">
              <h3 className="dashboard-page__persistent-title">{task.title}</h3>
              <p className="dashboard-page__persistent-desc">
                {task.dueLabel} • {getTaskDescription(task)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskListItem({
  task,
  showPriorityChip = false,
  onToggleTask,
}: {
  task: TaskItem;
  showPriorityChip?: boolean;
  onToggleTask: (taskId: string) => void;
}) {
  const itemClassName = [
    "dashboard-page__todo-item",
    task.completed ? "dashboard-page__todo-item--completed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={itemClassName} key={task.id}>
      <button
        className="dashboard-page__todo-check"
        type="button"
        onClick={() => onToggleTask(task.id)}
        title={getTaskActionLabel(task)}
        aria-label={getTaskAriaLabel(task)}
      >
        <div className="dashboard-page__todo-check-inner" />
      </button>
      <div className="dashboard-page__todo-main">
        <div className="dashboard-page__todo-main-top">
          <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
          <span className="dashboard-page__todo-due-label">{task.dueLabel}</span>
        </div>
        <p className="dashboard-page__todo-desc">{getTaskDescription(task)}</p>
      </div>
      <div className="dashboard-page__todo-side dashboard-page__todo-side--visible">
        <span className="dashboard-page__todo-chip">{getListChipLabel(task)}</span>
        {showPriorityChip ? (
          <span className="dashboard-page__todo-chip dashboard-page__todo-chip--subtle">{task.priority}</span>
        ) : (
          <span className="material-symbols-outlined dashboard-page__todo-drag">drag_indicator</span>
        )}
      </div>
    </article>
  );
}

function TaskListSection({
  title,
  count,
  emptyText,
  tasks,
  showPriorityChip = false,
  onToggleTask,
}: {
  title: string;
  count: number;
  emptyText: string;
  tasks: TaskItem[];
  showPriorityChip?: boolean;
  onToggleTask: (taskId: string) => void;
}) {
  return (
    <section className="dashboard-page__section">
      <div className="dashboard-page__todo-header">
        <h4 className="dashboard-page__todo-title">{title}</h4>
        <span className="dashboard-page__todo-badge">{count} TAREAS</span>
      </div>

      {tasks.length === 0 ? (
        <p className="dashboard-page__empty-state">{emptyText}</p>
      ) : (
        <div className="dashboard-page__todo-list">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              showPriorityChip={showPriorityChip}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardContent({
  isCreateOpen,
  form,
  submitError,
  isSubmitting,
  loading,
  showPersistentRail,
  showPendingList,
  collections,
  viewMeta,
  activeTasks,
  onFormChange,
  onCreateTask,
  onCancelCreate,
  onToggleTask,
}: {
  isCreateOpen: boolean;
  form: TaskFormState;
  submitError: string | null;
  isSubmitting: boolean;
  loading: boolean;
  showPersistentRail: boolean;
  showPendingList: boolean;
  collections: TaskCollections;
  viewMeta: ViewMeta;
  activeTasks: TaskItem[];
  onFormChange: <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => void;
  onCreateTask: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelCreate: () => void;
  onToggleTask: (taskId: string) => void;
}) {
  return (
    <div className="dashboard-page__content">
      {isCreateOpen ? (
        <CreateTaskPanel
          form={form}
          submitError={submitError}
          isSubmitting={isSubmitting}
          onChange={onFormChange}
          onSubmit={onCreateTask}
          onCancel={onCancelCreate}
        />
      ) : null}

      {loading ? <p className="dashboard-page__empty-state">Cargando tareas...</p> : null}

      {!loading && showPersistentRail ? (
        <PersistentTasksSection tasks={collections.persistent} onToggleTask={onToggleTask} />
      ) : null}

      {!loading && showPendingList ? (
        <TaskListSection
          title="Pendientes"
          count={collections.normal.length}
          emptyText="No hay tareas normales pendientes."
          tasks={collections.normal}
          onToggleTask={onToggleTask}
        />
      ) : null}

      {!loading && !showPendingList ? (
        <TaskListSection
          title={viewMeta.title}
          count={activeTasks.length}
          emptyText={viewMeta.empty}
          tasks={activeTasks}
          showPriorityChip
          onToggleTask={onToggleTask}
        />
      ) : null}
    </div>
  );
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

  const collections = useMemo(() => getTaskCollections(tasks), [tasks]);
  const viewMeta = VIEW_META[activeView];
  const activeTasks = getActiveTasks(activeView, collections);
  const showPersistentRail = activeView === "today" && collections.persistent.length > 0;
  const showPendingList = activeView === "today";

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((item) => (item.id === taskId ? { ...item, completed: newCompleted } : item))
    );

    const success = await updateTaskStatus(taskId, newCompleted);
    if (!success) {
      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, completed: task.completed } : item))
      );
    }
  };

  const handleFormChange = <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSubmitError(null);
  };

  const closeCreatePanel = () => {
    resetForm();
    setIsCreateOpen(false);
  };

  const toggleCreatePanel = () => {
    setIsCreateOpen((prev) => !prev);
    setSubmitError(null);
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const note = form.note.trim();
    const dueLabel = form.dueLabel.trim() || "Sin fecha fija";

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
      dueLabel,
      completed: false,
    });

    if (!createdTask) {
      setSubmitError("No se pudo crear la tarea.");
      setIsSubmitting(false);
      return;
    }

    setTasks((prev) => [createdTask, ...prev]);
    closeCreatePanel();
    setIsSubmitting(false);
  };

  return (
    <Shell>
      <main className="dashboard-page">
        <DashboardSidebar activeView={activeView} onSelectView={setActiveView} />

        <section className="dashboard-page__canvas">
          <DashboardTopbar
            viewMeta={viewMeta}
            activeView={activeView}
            todayLabel={todayLabel}
            isCreateOpen={isCreateOpen}
            onToggleCreate={toggleCreatePanel}
          />

          <DashboardContent
            isCreateOpen={isCreateOpen}
            form={form}
            submitError={submitError}
            isSubmitting={isSubmitting}
            loading={loading}
            showPersistentRail={showPersistentRail}
            showPendingList={showPendingList}
            collections={collections}
            viewMeta={viewMeta}
            activeTasks={activeTasks}
            onFormChange={handleFormChange}
            onCreateTask={handleCreateTask}
            onCancelCreate={closeCreatePanel}
            onToggleTask={handleToggleTask}
          />
        </section>
      </main>
    </Shell>
  );
}
