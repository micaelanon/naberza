"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Priority, Task, TaskKind } from "@/modules/tasks/task.types";
import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";

import type {
  StatusTab,
  StatusTabOption,
  TaskCreateFormProps,
  TaskEditFormProps,
  TaskFormFieldsProps,
  TaskFormState,
  TaskItemActionsProps,
  TaskListItemProps,
  TasksApiResponse,
  TasksContentProps,
} from "./utils/types";
import "./tasks-view.css";

const STATUS_TABS: StatusTabOption[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completadas" },
];

const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja", NONE: "" };
const KIND_LABELS: Record<string, string> = { NORMAL: "Normal", PERSISTENT: "Persistente", RECURRING: "Recurrente" };

const PAGE_SIZE = 10;

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

function filterTasks(tasks: Task[], query: string, priority: Priority | "ALL"): Task[] {
  return tasks.filter((task) => {
    if (priority !== "ALL" && task.priority !== priority) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(q);
      const inDesc = task.description?.toLowerCase().includes(q) ?? false;
      const inTags = task.tags.some((t) => t.toLowerCase().includes(q));
      if (!inTitle && !inDesc && !inTags) return false;
    }
    return true;
  });
}

// ─── Shared form fields ───────────────────────────────────────────────────────

const TaskFormFields = ({ form, onChange, saving, error, submitLabel, onCancel }: TaskFormFieldsProps): ReactNode  => {
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

const TaskCreateForm = ({ onCreated, onCancel }: TaskCreateFormProps): ReactNode  => {
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Tarea creada"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
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
  }, [form, onCreated, setError, submit]);

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

const TaskEditForm = ({ task, onSaved, onCancel }: TaskEditFormProps): ReactNode  => {
  const [form, setForm] = useState<TaskFormState>(() => taskToForm(task));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Cambios guardados"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
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
  }, [form, onSaved, setError, submit, task.id]);

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

const TaskItemActions = ({ task, isActive, onEdit, onComplete, onCancel, onDelete }: TaskItemActionsProps): ReactNode  => {
  return (
    <div className="task-item__actions">
      {task.dueAt && (
        <time className="task-item__due" dateTime={new Date(task.dueAt).toISOString()}>
          {new Date(task.dueAt).toLocaleDateString("es-ES")}
        </time>
      )}
      <button className="task-item__btn task-item__btn--delete" onClick={onDelete} title="Eliminar">
        <span className="material-symbols-outlined">delete</span>
      </button>
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

const TaskListItem = ({ task, onComplete, onCancel, onEdited, onDeleted }: TaskListItemProps): ReactNode  => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const isActive = task.status === "PENDING" || task.status === "IN_PROGRESS";

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/tasks/api/${task.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast("Tarea eliminada");
      onDeleted();
    } catch {
      showToast("Error al eliminar la tarea", "error");
    } finally {
      setDeleting(false);
    }
  }, [onDeleted, showToast, task.id]);

  if (editing) {
    return (
      <li className="task-item task-item--editing">
        <TaskEditForm task={task} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`task-item task-item--${task.status.toLowerCase()}`}>
      <ConfirmDeleteModal
        isOpen={confirmDelete}
        itemName={task.title}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
        deleting={deleting}
      />
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
      <TaskItemActions task={task} isActive={isActive} onEdit={() => setEditing(true)} onComplete={onComplete} onCancel={onCancel} onDelete={() => setConfirmDelete(true)} />
    </li>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────

const TasksContent = ({ isLoading, error, tasks, onComplete, onCancel, onEdited, onDeleted, hasActiveFilters }: TasksContentProps): ReactNode  => {
  if (isLoading) return <div className="tasks-view__loading">Cargando...</div>;
  if (error) return <div className="tasks-view__error" role="alert">{error}</div>;
  if (tasks.length === 0) {
    return (
      <div className="tasks-view__empty">
        <p className="tasks-view__empty-title">{hasActiveFilters ? "Sin resultados" : "Sin tareas"}</p>
        <p className="tasks-view__empty-text">
          {hasActiveFilters
            ? "No hay tareas que coincidan con los filtros."
            : "Haz clic en \"+ Nueva tarea\" para crear tu primera tarea."}
        </p>
      </div>
    );
  }
  return (
    <ul className="tasks-view__list">
      {tasks.map((task) => (
        <TaskListItem key={task.id} task={task} onComplete={onComplete} onCancel={onCancel} onEdited={onEdited} onDeleted={onDeleted} />
      ))}
    </ul>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const TasksView = (): ReactNode  => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filterPriority, setFilterPriority] = useState<Priority | "ALL">("ALL");

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

  const handleComplete = useCallback(async (id: string) => {
    const response = await fetch(`/tasks/api/${id}/complete`, { method: "POST" });
    if (response.ok) void fetchTasks(activeTab);
  }, [activeTab, fetchTasks]);

  const handleCancel = useCallback(async (id: string) => {
    const response = await fetch(`/tasks/api/${id}/cancel`, { method: "POST" });
    if (response.ok) void fetchTasks(activeTab);
  }, [activeTab, fetchTasks]);

  const filteredTasks = filterTasks(tasks, searchQuery, filterPriority);
  const hasFilters = searchQuery.trim() !== "" || filterPriority !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE)));
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="search"
          placeholder="Buscar tareas..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value as Priority | "ALL"); setPage(1); }}
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Media</option>
          <option value="LOW">Baja</option>
          <option value="NONE">Sin prioridad</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterPriority("ALL"); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{filteredTasks.length} de {tasks.length}</span>
        )}
      </div>

      <div className="tasks-view__content">
        <TasksContent
          isLoading={isLoading}
          error={error}
          tasks={paginatedTasks}
          onComplete={(id) => void handleComplete(id)}
          onCancel={(id) => void handleCancel(id)}
          onEdited={() => void fetchTasks(activeTab)}
          onDeleted={() => void fetchTasks(activeTab)}
          hasActiveFilters={hasFilters}
        />
      </div>
      <Pagination currentPage={currentPage} totalItems={filteredTasks.length} pageSize={PAGE_SIZE} itemLabel="tareas" onPageChange={setPage} />
    </div>
  );
}

export default TasksView;
