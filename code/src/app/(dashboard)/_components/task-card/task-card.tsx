import type { TaskCardProps } from "./utils/types";
import "./task-card.css";

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card__meta">
        <span className="task-card__pill">{task.kind === "persistent" ? "Persistente" : "Normal"}</span>
        <span className="task-card__pill">{task.channel}</span>
        <span className="task-card__pill task-card__pill--warning">Prioridad {task.priority}</span>
      </div>

      <h3 className="task-card__title">{task.title}</h3>
      <p className="task-card__note">{task.note}</p>

      <div className="task-card__footer">
        <span className="task-card__due">{task.dueLabel}</span>
        <button className="task-card__button" type="button">
          {task.completed ? "Hecha" : "Marcar hecha"}
        </button>
      </div>
    </article>
  );
}
