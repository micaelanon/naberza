import Shell from "@/components/ui/shell";
import { TASKS } from "@/lib/tasks";
import TaskList from "./_components/task-list";
import "./page.css";

export default function DashboardPage() {
  const pendingTasks = TASKS.filter((task) => !task.completed);
  const persistentTasks = pendingTasks.filter((task) => task.kind === "persistent");
  const completedTasks = TASKS.filter((task) => task.completed);

  return (
    <Shell>
      <main className="dashboard-page">
        <section className="dashboard-page__hero">
          <p className="dashboard-page__eyebrow">naBerza · v1 mínima</p>
          <h1 className="dashboard-page__title">Tus pendientes, sin ruido.</h1>
          <p className="dashboard-page__description">
            Una base sobria para centralizar tareas generales, distinguir recordatorios persistentes y preparar avisos diarios por Telegram u otros canales.
          </p>
        </section>

        <section className="dashboard-page__stats" aria-label="Resumen de tareas">
          <article className="dashboard-page__stat">
            <span className="dashboard-page__stat-label">Pendientes</span>
            <strong className="dashboard-page__stat-value">{pendingTasks.length}</strong>
          </article>
          <article className="dashboard-page__stat">
            <span className="dashboard-page__stat-label">Persistentes</span>
            <strong className="dashboard-page__stat-value">{persistentTasks.length}</strong>
          </article>
          <article className="dashboard-page__stat">
            <span className="dashboard-page__stat-label">Hechas</span>
            <strong className="dashboard-page__stat-value">{completedTasks.length}</strong>
          </article>
        </section>

        <TaskList tasks={pendingTasks} />
      </main>
    </Shell>
  );
}
