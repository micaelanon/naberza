"use client";

import { useCallback, useEffect, useState } from "react";

import type { Task, TaskStatus } from "@/modules/tasks/task.types";
import "./tasks-view.css";

type StatusTab = "ALL" | TaskStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completadas" },
];

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
  NONE: "",
};

const KIND_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  PERSISTENT: "Persistente",
  RECURRING: "Recurrente",
};

interface TasksApiResponse {
  data: Task[];
  meta: { total: number; page: number; pageSize: number };
}

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    void fetchTasks(activeTab);
  }, [activeTab, fetchTasks]);

  const handleComplete = async (id: string) => {
    try {
      const response = await fetch(`/tasks/api/${id}/complete`, { method: "POST" });
      if (!response.ok) throw new Error("Error al completar");
      void fetchTasks(activeTab);
    } catch (err) {
      console.error("[TasksView] complete error:", err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`/tasks/api/${id}/cancel`, { method: "POST" });
      if (!response.ok) throw new Error("Error al cancelar");
      void fetchTasks(activeTab);
    } catch (err) {
      console.error("[TasksView] cancel error:", err);
    }
  };

  return (
    <div className="tasks-view">
      <header className="tasks-view__header">
        <h1 className="tasks-view__title">Tareas</h1>
        <span className="tasks-view__count">{total} tareas</span>
      </header>

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
        {isLoading && <div className="tasks-view__loading">Cargando...</div>}

        {!isLoading && error && (
          <div className="tasks-view__error" role="alert">{error}</div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="tasks-view__empty">
            <p className="tasks-view__empty-title">Sin tareas</p>
            <p className="tasks-view__empty-text">
              Las tareas creadas desde el inbox o manualmente aparecerán aquí.
            </p>
          </div>
        )}

        {!isLoading && !error && tasks.length > 0 && (
          <ul className="tasks-view__list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-item task-item--${task.status.toLowerCase()}`}>
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
                    <p className="task-item__description">
                      {task.description.slice(0, 100)}{task.description.length > 100 ? "…" : ""}
                    </p>
                  )}
                  {task.tags.length > 0 && (
                    <div className="task-item__tags">
                      {task.tags.map((tag) => (
                        <span key={tag} className="task-item__tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="task-item__actions">
                  {task.dueAt && (
                    <time className="task-item__due" dateTime={new Date(task.dueAt).toISOString()}>
                      {new Date(task.dueAt).toLocaleDateString("es-ES")}
                    </time>
                  )}
                  {task.status === "PENDING" || task.status === "IN_PROGRESS" ? (
                    <>
                      <button
                        className="task-item__btn task-item__btn--complete"
                        onClick={() => void handleComplete(task.id)}
                        title="Completar"
                      >
                        ✓
                      </button>
                      <button
                        className="task-item__btn task-item__btn--cancel"
                        onClick={() => void handleCancel(task.id)}
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="task-item__status-badge">
                      {task.status === "COMPLETED" ? "Completada" : "Cancelada"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
