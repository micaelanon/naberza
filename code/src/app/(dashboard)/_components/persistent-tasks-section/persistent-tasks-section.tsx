import { getPriorityLabel } from "./utils/helpers";
import type { PersistentTasksSectionProps } from "./utils/types";
import "./persistent-tasks-section.css";

const PersistentTasksSection = ({ tasks, onToggleTask }: PersistentTasksSectionProps) => (
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
              title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
            >
              ↻
            </button>
            <span className="dashboard-page__persistent-tag">{getPriorityLabel(task.priority)}</span>
          </div>
          <div className="dashboard-page__persistent-info">
            <h3 className="dashboard-page__persistent-title">{task.title}</h3>
            <p className="dashboard-page__persistent-desc">
              {task.dueLabel} • {task.note || "Sin nota adicional."}
            </p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default PersistentTasksSection;
