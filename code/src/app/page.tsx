"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/ui/shell";
import { TASKS, type TaskItem } from "@/lib/tasks";
import "./page.css";

type DashboardView = "today" | "upcoming" | "persistent" | "completed";

type NavItem = {
  key: DashboardView;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "Hoy", icon: "calendar_today" },
  { key: "upcoming", label: "Próximamente", icon: "event_upcoming" },
  { key: "persistent", label: "Persistentes", icon: "push_pin" },
  { key: "completed", label: "Completadas", icon: "task_alt" },
];

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
  const [activeView, setActiveView] = useState<DashboardView>("today");

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );

  const pendingTasks = TASKS.filter((task) => !task.completed);
  const persistentTasks = pendingTasks.filter((task) => task.kind === "persistent");
  const normalTasks = pendingTasks.filter((task) => task.kind === "normal");
  const completedTasks = TASKS.filter((task) => task.completed);
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
              <button className="dashboard-page__primary-button" type="button">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
                <span>Añadir tarea</span>
              </button>
            </div>
          </header>

          <div className="dashboard-page__content">
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
                        <span className="material-symbols-outlined dashboard-page__persistent-icon" style={{ fontVariationSettings: "'FILL' 0" }}>autorenew</span>
                        <span className="dashboard-page__persistent-tag">
                          {task.priority === "high" ? "Prioridad" : task.priority === "medium" ? "Seguimiento" : "Rutina"}
                        </span>
                      </div>
                      <div className="dashboard-page__persistent-info">
                        <h3 className="dashboard-page__persistent-title">{task.title}</h3>
                        <p className="dashboard-page__persistent-desc">{task.dueLabel} • {task.note}</p>
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
                        <div className="dashboard-page__todo-check">
                          <div className="dashboard-page__todo-check-inner" />
                        </div>
                        <div className="dashboard-page__todo-main">
                          <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                          <p className="dashboard-page__todo-desc">{task.note}</p>
                        </div>
                        <div className="dashboard-page__todo-side">
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
                        <div className="dashboard-page__todo-check">
                          <div className="dashboard-page__todo-check-inner" />
                        </div>
                        <div className="dashboard-page__todo-main">
                          <div className="dashboard-page__todo-main-top">
                            <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                            <span className="dashboard-page__todo-due-label">{task.dueLabel}</span>
                          </div>
                          <p className="dashboard-page__todo-desc">{task.note}</p>
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
          </div>
        </section>
      </main>
    </Shell>
  );
}
