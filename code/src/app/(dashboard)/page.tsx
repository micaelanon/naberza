import Shell from "@/components/ui/shell";
import { TASKS } from "@/lib/tasks";
import "./page.css";

export default function DashboardPage() {
  const pendingTasks = TASKS.filter((task) => !task.completed);
  const persistentTasks = pendingTasks.filter((task) => task.kind === "persistent");
  const normalTasks = pendingTasks.filter((task) => task.kind === "normal");

  return (
    <Shell>
      <main className="dashboard-page">
        <aside className="dashboard-page__sidebar">
          <div className="dashboard-page__brand-block">
            <h1 className="dashboard-page__brand">naBerza</h1>
            <p className="dashboard-page__brand-subtitle">Tu refugio tranquilo</p>
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
              <p className="dashboard-page__profile-name">Julian Vane</p>
              <p className="dashboard-page__profile-meta">Miembro premium</p>
            </div>
          </div>
        </aside>

        <section className="dashboard-page__canvas">
          <header className="dashboard-page__topbar">
            <div>
              <h2 className="dashboard-page__topbar-title">Hoy</h2>
              <p className="dashboard-page__topbar-date">Martes, 14 de abril</p>
            </div>
            <div className="dashboard-page__topbar-actions">
              <button className="dashboard-page__icon-button" type="button">◔</button>
              <button className="dashboard-page__icon-button" type="button">⚙</button>
              <button className="dashboard-page__primary-button" type="button">Añadir tarea</button>
            </div>
          </header>

          <div className="dashboard-page__content">
            <section className="dashboard-page__section">
              <div className="dashboard-page__section-heading">
                <span className="dashboard-page__section-kicker">Recordatorios persistentes</span>
                <div className="dashboard-page__section-line" />
              </div>

              <div className="dashboard-page__persistent-grid">
                {persistentTasks.map((task) => (
                  <article className="dashboard-page__persistent-card" key={task.id}>
                    <div className="dashboard-page__persistent-topline">
                      <span className="dashboard-page__persistent-refresh">↻</span>
                      <span className="dashboard-page__persistent-tag">{task.priority === "high" ? "Prioridad" : "Salud"}</span>
                    </div>
                    <div className="dashboard-page__persistent-body">
                      <h3 className="dashboard-page__persistent-title">{task.title}</h3>
                      <p className="dashboard-page__persistent-copy">{task.dueLabel} • {task.note}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-page__section">
              <div className="dashboard-page__todo-header">
                <h4 className="dashboard-page__todo-title">Pendientes</h4>
                <span className="dashboard-page__todo-badge">{normalTasks.length} TAREAS</span>
              </div>

              <div className="dashboard-page__todo-list">
                {normalTasks.map((task) => (
                  <article className="dashboard-page__todo-item" key={task.id}>
                    <div className="dashboard-page__todo-check" />
                    <div className="dashboard-page__todo-main">
                      <div className="dashboard-page__todo-title-row">
                        <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
                        {task.id === "arnes-perro" ? null : <span className="dashboard-page__todo-time">4:00 PM</span>}
                      </div>
                      <p className="dashboard-page__todo-copy">{task.note}</p>
                    </div>
                    <div className="dashboard-page__todo-side">
                      <span className="dashboard-page__todo-chip">{task.channel === "dashboard" ? "Personal" : "Salud"}</span>
                      <span className="dashboard-page__todo-drag">⋮⋮</span>
                    </div>
                  </article>
                ))}
              </div>
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
