"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { Priority, Task, TaskKind } from "@/modules/tasks/task.types";

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
      const inTags = task.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!inTitle && !inDesc && !inTags) return false;
    }
    return true;
  });
}

const TaskFormFields = ({ form, onChange, saving, error, submitLabel, onCancel }: TaskFormFieldsProps): ReactNode  => {
  const t = useTranslations();

  return (
    <>
      <div className="task-form__row">
        <input
          className="task-form__input task-form__input--title"
          type="text"
          placeholder={t("app.tasks.titlePlaceholder")}
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          autoFocus
        />
      </div>
      <div className="task-form__row">
        <textarea
          className="task-form__input task-form__input--description"
          placeholder={t("app.tasks.descPlaceholder")}
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="task-form__row task-form__row--inline">
        <select className="task-form__select" value={form.priority} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
          <option value="NONE">{t("app.tasks.priority.none")}</option>
          <option value="LOW">{t("app.tasks.priority.low")}</option>
          <option value="MEDIUM">{t("app.tasks.priority.medium")}</option>
          <option value="HIGH">{t("app.tasks.priority.high")}</option>
        </select>
        <select className="task-form__select" value={form.kind} onChange={(e) => onChange({ kind: e.target.value as TaskKind })}>
          <option value="NORMAL">{t("app.tasks.type.normal")}</option>
          <option value="PERSISTENT">{t("app.tasks.type.persistent")}</option>
          <option value="RECURRING">{t("app.tasks.type.recurring")}</option>
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
          placeholder={t("app.tasks.tagsPlaceholder")}
          value={form.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
        />
      </div>
      {error && <p className="task-form__error">{error}</p>}
      <div className="task-form__actions">
        <button className="task-form__btn task-form__btn--save" type="submit" disabled={saving}>
          {saving ? t("app.common.loading") : submitLabel}
        </button>
        <button className="task-form__btn task-form__btn--cancel" type="button" onClick={onCancel}>
          {t("app.common.cancel")}
        </button>
      </div>
    </>
  );
};

const TaskCreateForm = ({ onCreated, onCancel }: TaskCreateFormProps): ReactNode  => {
  const t = useTranslations();
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.tasks.toast.created")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(t("app.tasks.error.requiredTitle"));
      return;
    }

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
          tags: form.tags ? form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("app.tasks.error.create"));
      }
      setForm(EMPTY_FORM);
      onCreated();
    });
  }, [form, onCreated, setError, submit, t]);

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <TaskFormFields
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        saving={saving}
        error={error}
        submitLabel={t("app.tasks.action.create")}
        onCancel={onCancel}
      />
    </form>
  );
};

const TaskEditForm = ({ task, onSaved, onCancel }: TaskEditFormProps): ReactNode  => {
  const t = useTranslations();
  const [form, setForm] = useState<TaskFormState>(() => taskToForm(task));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(t("app.tasks.error.requiredTitle"));
      return;
    }

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
          tags: form.tags ? form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("app.tasks.error.save"));
      }
      onSaved();
    });
  }, [form, onSaved, setError, submit, t, task.id]);

  return (
    <form className="task-form task-form--edit" onSubmit={handleSubmit}>
      <TaskFormFields
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        saving={saving}
        error={error}
        submitLabel={t("app.tasks.action.save")}
        onCancel={onCancel}
      />
    </form>
  );
};

const TaskItemActions = ({ task, isActive, onEdit, onComplete, onCancel, onDelete }: TaskItemActionsProps): ReactNode  => {
  const t = useTranslations();

  return (
    <div className="task-item__actions">
      {task.dueAt && (
        <time className="task-item__due" dateTime={new Date(task.dueAt).toISOString()}>
          {new Date(task.dueAt).toLocaleDateString("es-ES")}
        </time>
      )}
      <button className="task-item__btn task-item__btn--delete" onClick={onDelete} title={t("app.common.delete")}>
        <span className="material-symbols-outlined">delete</span>
      </button>
      {isActive ? (
        <>
          <button className="task-item__btn task-item__btn--edit" onClick={onEdit} title={t("app.common.edit")}>✎</button>
          <button className="task-item__btn task-item__btn--complete" onClick={() => onComplete(task.id)} title={t("app.tasks.action.complete")}>✓</button>
          <button className="task-item__btn task-item__btn--cancel" onClick={() => onCancel(task.id)} title={t("app.common.cancel")}>✕</button>
        </>
      ) : (
        <span className="task-item__status-badge">{task.status === "COMPLETED" ? t("app.status.completed") : t("app.status.cancelled")}</span>
      )}
    </div>
  );
};

const TaskListItem = ({ task, onComplete, onCancel, onEdited, onDeleted }: TaskListItemProps): ReactNode  => {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const isActive = task.status === "PENDING" || task.status === "IN_PROGRESS";

  const priorityLabels = useMemo<Record<string, string>>(() => ({
    HIGH: t("app.tasks.priority.high"),
    MEDIUM: t("app.tasks.priority.medium"),
    LOW: t("app.tasks.priority.low"),
    NONE: "",
  }), [t]);

  const kindLabels = useMemo<Record<string, string>>(() => ({
    NORMAL: t("app.tasks.type.normal"),
    PERSISTENT: t("app.tasks.type.persistent"),
    RECURRING: t("app.tasks.type.recurring"),
  }), [t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/tasks/api/${task.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast(t("app.tasks.toast.deleted"));
      onDeleted();
    } catch {
      showToast(t("app.tasks.error.delete"), "error");
    } finally {
      setDeleting(false);
    }
  }, [onDeleted, showToast, t, task.id]);

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
          <span className="task-item__kind">{kindLabels[task.kind] ?? task.kind}</span>
          {task.priority !== "NONE" && (
            <span className={`task-item__priority task-item__priority--${task.priority.toLowerCase()}`}>
              {priorityLabels[task.priority]}
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
};

const TasksContent = ({ isLoading, error, tasks, onComplete, onCancel, onEdited, onDeleted, hasActiveFilters }: TasksContentProps): ReactNode  => {
  const t = useTranslations();

  if (isLoading) return <div className="tasks-view__loading">{t("app.common.loading")}</div>;
  if (error) return <div className="tasks-view__error" role="alert">{error}</div>;
  if (tasks.length === 0) {
    return (
      <div className="tasks-view__empty">
        <p className="tasks-view__empty-title">{hasActiveFilters ? t("app.common.noResults") : t("app.tasks.empty.title")}</p>
        <p className="tasks-view__empty-text">
          {hasActiveFilters ? t("app.tasks.empty.filtered") : t("app.tasks.empty.default")}
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
};

function useTasksViewState(t: ReturnType<typeof useTranslations>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filterPriority, setFilterPriority] = useState<Priority | "ALL">("ALL");

  const statusTabs = useMemo<StatusTabOption[]>(() => ([
    { value: "ALL", label: t("app.tasks.tab.all") },
    { value: "PENDING", label: t("app.tasks.tab.pending") },
    { value: "IN_PROGRESS", label: t("app.tasks.tab.inProgress") },
    { value: "COMPLETED", label: t("app.tasks.tab.completed") },
  ]), [t]);

  const fetchTasks = useCallback(async (status: StatusTab) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(`/tasks/api?${params.toString()}`);
      if (!response.ok) throw new Error(t("app.tasks.error.load"));
      const json = (await response.json()) as TasksApiResponse;
      setTasks(json.data);
      setTotal(json.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeTab !== "ALL") params.set("status", activeTab);
        const response = await fetch(`/tasks/api?${params.toString()}`);
        if (!response.ok) throw new Error(t("app.tasks.error.load"));
        const json = (await response.json()) as TasksApiResponse;
        if (!isMounted) return;
        setTasks(json.data);
        setTotal(json.meta.total);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : t("app.common.error"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadTasks();

    return () => {
      isMounted = false;
    };
  }, [activeTab, t]);

  return {
    tasks,
    total,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    showCreateForm,
    setShowCreateForm,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    filterPriority,
    setFilterPriority,
    statusTabs,
    fetchTasks,
  };
}

const TasksView = (): ReactNode  => {
  const t = useTranslations();
  const {
    tasks,
    total,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    showCreateForm,
    setShowCreateForm,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    filterPriority,
    setFilterPriority,
    statusTabs,
    fetchTasks,
  } = useTasksViewState(t);

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
        <h1 className="tasks-view__title">{t("app.tasks.title")}</h1>
        <span className="tasks-view__count">{t("app.tasks.count", { count: total })}</span>
        <button className="tasks-view__add-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? "✕" : t("app.tasks.action.new")}
        </button>
      </header>

      {showCreateForm && (
        <TaskCreateForm
          onCreated={() => { setShowCreateForm(false); void fetchTasks(activeTab); }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <nav className="tasks-view__tabs" role="tablist">
        {statusTabs.map((tab) => (
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
          placeholder={t("app.tasks.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value as Priority | "ALL"); setPage(1); }}
        >
          <option value="ALL">{t("app.tasks.filter.allPriorities")}</option>
          <option value="HIGH">{t("app.tasks.priority.high")}</option>
          <option value="MEDIUM">{t("app.tasks.priority.medium")}</option>
          <option value="LOW">{t("app.tasks.priority.low")}</option>
          <option value="NONE">{t("app.tasks.priority.none")}</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterPriority("ALL"); setPage(1); }}>
            {t("app.tasks.filter.clear")}
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{t("app.tasks.filter.count", { filtered: filteredTasks.length, total: tasks.length })}</span>
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
      <Pagination currentPage={currentPage} totalItems={filteredTasks.length} pageSize={PAGE_SIZE} itemLabel={t("app.tasks.paginationLabel")} onPageChange={setPage} />
    </div>
  );
};

export default TasksView;
