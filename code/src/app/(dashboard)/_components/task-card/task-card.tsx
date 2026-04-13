import type { TaskCardProps } from "./utils/types";
import "./task-card.css";

export default function TaskCard({ task }: TaskCardProps) {
  const kindLabel = task.kind === "persistent" ? "Persistente" : "General";

  return (
    <article className={`task-card ${task.kind === "persistent" ? "task-card--persistent" : ""}`.trim()}>
      <div className="task-card__topline">
        <span className="task-card__kind">{kindLabel}</span>
        <span className="task-card__due">{task.dueLabel}</span>
      </div>

      <h3 className="task-card__title">{task.title}</h3>
      <p className="task-card__note">{task.note}</p>

      <div className="task-card__footer">
        <div className="task-card__meta">
          <span className="task-card__pill">{task.channel}</span>
          <span className="task-card__pill task-card__pill--warning">Prioridad {task.priority}</span>
        </div>

        <button className="task-card__button" type="button">
          {task.completed ? "Hecha" : "Marcar hecha"}
        </button>
      </div>
    </article>
  );
}
