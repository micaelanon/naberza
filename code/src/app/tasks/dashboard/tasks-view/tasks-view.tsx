"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Task, TaskStatus, Priority, TaskKind } from "@/modules/tasks/task.types";
import { useFormSubmit } from "@/hooks";
import "./tasks-view.css";

type StatusTab = "ALL" | TaskStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completadas" },
];

const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja", NONE: "" };
const KIND_LABELS: Record<string, string> = { NORMAL: "Normal", PERSISTENT: "Persistente", RECURRING: "Recurrente" };

interface TasksApiResponse {
  data: Task[];
  meta: { total: number; page: number; pageSize: number };
}

interface TaskFormState {
  title: string;
  description: string;
  priority: Priority;
  kind: TaskKind;
  dueAt: string;
  tags: string;
}

const EMPTY_FORM: TaskFormState = { title: "", description: "", priority: "NONE", kind: "NORMAL", dueAt: "", tags: "" };

function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    kind: task.kind,
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "",
    tags: task.tags.join(", "),
  };
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function TaskFormFields({
  form,
  onChange,
  saving,
  error,
  submitLabel,
  onCancel,
}: {
  form: TaskFormState;
  onChange: (patch: Partial<TaskFormState>) => void;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onCancel: () => void;
}): ReactNode {
  return (
    <>
      <div className="task-form__row">
        <input
          className="task-form__input task-form__input--title"
          type="text"
          placeholder="¿Qué necesitas hacer?"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          autoFocus
        />
      </div>
      <div className="task-form__row">
        <textarea
          className="task-form__input task-form__input--description"
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="task-form__row task-form__row--inline">
        <select className="task-form__select" value={form.priority} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
          <option value="NONE">Sin prioridad</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <select className="task-form__select" value={form.kind} onChange={(e) => onChange({ kind: e.target.value as TaskKind })}>
          <option value="NORMAL">Normal</option>
          <option value="PERSISTENT">Persistente</option>
          <option value="RECURRING">Recurrente</option>
        </select>
        <input
          className="task-form__input task-form__input--date"
          type="date"
          value={form.dueAt}
          onChange={(e) => onChange({ dueAt: e.target.value })}
        />
      </div>
      <div className="task-form__row">
        <input
          className="task-form__input"
          type="text"
          placeholder="Etiquetas (separadas por coma)"
          value={form.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
        />
      </div>
      {error && <p className="task-form__error">{error}</p>}
      <div className="task-form__actions">
        <button className="task-form__btn task-form__btn--save" type="submit" disabled={saving}>
          {saving ? "Guardando..." : submitLabel}
        </button>
        <button className="task-form__btn task-form__btn--cancel" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function TaskCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const { saving, error, setError, submit } = useFormSubmit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch("/tasks/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          kind: form.kind,
          dueAt: form.dueAt || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Error al crear la tarea");
      }
      setForm(EMPTY_FORM);
      onCreated();
    });
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <TaskFormFields
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        saving={saving}
        error={error}
        submitLabel="Crear tarea"
        onCancel={onCancel}
      />
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function TaskEditForm({ task, onSaved, onCancel }: { task: Task; onSaved: () => void; onCancel: () => void }): ReactNode {
  const [form, setForm] = useState<TaskFormState>(() => taskToForm(task));
  const { saving, error, setError, submit } = useFormSubmit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch(`/tasks/api/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          kind: form.kind,
          dueAt: form.dueAt || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Error al guardar");
      }
      onSaved();
    });
  };

  return (
    <form className="task-form task-form--edit" onSubmit={handleSubmit}>
      <TaskFormFields
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        saving={saving}
        error={error}
        submitLabel="Guardar cambios"
        onCancel={onCancel}
      />
    </form>
  );
}

// ─── Task item actions ───────────────────────────────────────────────────────

function TaskItemActions({ task, isActive, onEdit, onComplete, onCancel }: {
  task: Task;
  isActive: boolean;
  onEdit: () => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}): ReactNode {
  return (
    <div className="task-item__actions">
      {task.dueAt && (
        <time className="task-item__due" dateTime={new Date(task.dueAt).toISOString()}>
          {new Date(task.dueAt).toLocaleDateString("es-ES")}
        </time>
      )}
      {isActive ? (
        <>
          <button className="task-item__btn task-item__btn--edit" onClick={onEdit} title="Editar">✎</button>
          <button className="task-item__btn task-item__btn--complete" onClick={() => onComplete(task.id)} title="Completar">✓</button>
          <button className="task-item__btn task-item__btn--cancel" onClick={() => onCancel(task.id)} title="Cancelar">✕</button>
        </>
      ) : (
        <span className="task-item__status-badge">{task.status === "COMPLETED" ? "Completada" : "Cancelada"}</span>
      )}
    </div>
  );
}

// ─── Task list item ───────────────────────────────────────────────────────────

function TaskListItem({ task, onComplete, onCancel, onEdited }: {
  task: Task;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onEdited: () => void;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const isActive = task.status === "PENDING" || task.status === "IN_PROGRESS";

  if (editing) {
    return (
      <li className="task-item task-item--editing">
        <TaskEditForm task={task} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`task-item task-item--${task.status.toLowerCase()}`}>
      <div className="task-item__main">
        <div className="task-item__meta-top">
          <span className="task-item__kind">{KIND_LABELS[task.kind] ?? task.kind}</span>
          {task.priority !== "NONE" && (
            <span className={`task-item__priority task-item__priority--${task.priority.toLowerCase()}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
        </div>
        <h3 className="task-item__title">{task.title}</h3>
        {task.description && (
          <p className="task-item__description">{task.description.slice(0, 100)}{task.description.length > 100 ? "…" : ""}</p>
        )}
        {task.tags.length > 0 && (
          <div className="task-item__tags">
            {task.tags.map((tag) => <span key={tag} className="task-item__tag">{tag}</span>)}
          </div>
        )}
      </div>
      <TaskItemActions task={task} isActive={isActive} onEdit={() => setEditing(true)} onComplete={onComplete} onCancel={onCancel} />
    </li>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────

function TasksContent({ isLoading, error, tasks, onComplete, onCancel, onEdited }: {
  isLoading: boolean; error: string | null; tasks: Task[];
  onComplete: (id: string) => void; onCancel: (id: string) => void; onEdited: () => void;
}): ReactNode {
  if (isLoading) return <div className="tasks-view__loading">Cargando...</div>;
  if (error) return <div className="tasks-view__error" role="alert">{error}</div>;
  if (tasks.length === 0) {
    return (
      <div className="tasks-view__empty">
        <p className="tasks-view__empty-title">Sin tareas</p>
        <p className="tasks-view__empty-text">Haz clic en &quot;+ Nueva tarea&quot; para crear tu primera tarea.</p>
      </div>
    );
  }
  return (
    <ul className="tasks-view__list">
      {tasks.map((task) => (
        <TaskListItem key={task.id} task={task} onComplete={onComplete} onCancel={onCancel} onEdited={onEdited} />
      ))}
    </ul>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function TasksView(): ReactNode {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchTasks = useCallback(async (status: StatusTab) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(`/tasks/api?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar las tareas");
      const json = (await response.json()) as TasksApiResponse;
      setTasks(json.data);
      setTotal(json.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTasks(activeTab) // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => { /* handled inside fetchTasks */ })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [activeTab, fetchTasks]);

  const handleComplete = async (id: string) => {
    const response = await fetch(`/tasks/api/${id}/complete`, { method: "POST" });
    if (response.ok) void fetchTasks(activeTab);
  };

  const handleCancel = async (id: string) => {
    const response = await fetch(`/tasks/api/${id}/cancel`, { method: "POST" });
    if (response.ok) void fetchTasks(activeTab);
  };

  return (
    <div className="tasks-view">
      <header className="tasks-view__header">
        <h1 className="tasks-view__title">Tareas</h1>
        <span className="tasks-view__count">{total} tareas</span>
        <button className="tasks-view__add-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "✕" : "+ Nueva tarea"}
        </button>
      </header>

      {showCreateForm && (
        <TaskCreateForm
          onCreated={() => { setShowCreateForm(false); void fetchTasks(activeTab); }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <nav className="tasks-view__tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`tasks-view__tab ${activeTab === tab.value ? "tasks-view__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="tasks-view__content">
        <TasksContent
          isLoading={isLoading}
          error={error}
          tasks={tasks}
          onComplete={(id) => void handleComplete(id)}
          onCancel={(id) => void handleCancel(id)}
          onEdited={() => void fetchTasks(activeTab)}
        />
      </div>
    </div>
  );
}
