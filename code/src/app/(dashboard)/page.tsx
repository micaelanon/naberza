import Shell from "@/components/ui/shell";
import { TASKS } from "@/lib/tasks";
import TaskList from "./_components/task-list";
import "./page.css";

export default function DashboardPage() {
  const pendingTasks = TASKS.filter((task) => !task.completed);
  const persistentTasks = pendingTasks.filter((task) => task.kind === "persistent");
  const normalTasks = pendingTasks.filter((task) => task.kind === "normal");
  const completedTasks = TASKS.filter((task) => task.completed);

  return (
    <Shell>
      <main className="dashboard-page">
        <section className="dashboard-page__intro">
          <div>
            <p className="dashboard-page__eyebrow">naBerza</p>
            <h1 className="dashboard-page__title">Un lugar tranquilo para lo importante.</h1>
          </div>
          <p className="dashboard-page__description">
            Tareas generales, recordatorios persistentes y pequeñas obligaciones personales, sin estética de dashboard corporativo.
          </p>
        </section>

        <section className="dashboard-page__summary" aria-label="Resumen">
          <article className="dashboard-page__summary-card dashboard-page__summary-card--primary">
            <span className="dashboard-page__summary-label">Ahora mismo</span>
            <strong className="dashboard-page__summary-value">{pendingTasks.length} pendientes</strong>
            <p className="dashboard-page__summary-note">Lo justo para ver qué merece atención hoy.</p>
          </article>
          <article className="dashboard-page__summary-card">
            <span className="dashboard-page__summary-label">Persistentes</span>
            <strong className="dashboard-page__summary-value">{persistentTasks.length}</strong>
            <p className="dashboard-page__summary-note">Las que vuelven hasta quedar resueltas.</p>
          </article>
          <article className="dashboard-page__summary-card">
            <span className="dashboard-page__summary-label">Cerradas</span>
            <strong className="dashboard-page__summary-value">{completedTasks.length}</strong>
            <p className="dashboard-page__summary-note">Ya fuera de la cabeza.</p>
          </article>
        </section>

        <section className="dashboard-page__section">
          <div className="dashboard-page__section-header">
            <div>
              <p className="dashboard-page__section-eyebrow">Foco</p>
              <h2 className="dashboard-page__section-title">Persistentes</h2>
            </div>
            <span className="dashboard-page__section-count">{persistentTasks.length}</span>
          </div>
          <TaskList tasks={persistentTasks} />
        </section>

        <section className="dashboard-page__section">
          <div className="dashboard-page__section-header">
            <div>
              <p className="dashboard-page__section-eyebrow">Resto</p>
              <h2 className="dashboard-page__section-title">Tareas generales</h2>
            </div>
            <span className="dashboard-page__section-count">{normalTasks.length}</span>
          </div>
          <TaskList tasks={normalTasks} />
        </section>
      </main>
    </Shell>
  );
}
