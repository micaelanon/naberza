import { getListChipLabel, getPriorityLabel } from "./utils/helpers";
import type { TaskListItemProps, TaskListSectionProps } from "./utils/types";
import "./task-list-section.css";

const TaskListItem = ({ task, showPriorityChip = false, onToggleTask }: TaskListItemProps) => (
  <article
    className={[
      "dashboard-page__todo-item",
      task.completed ? "dashboard-page__todo-item--completed" : "",
    ].filter(Boolean).join(" ")}
  >
    <button
      className="dashboard-page__todo-check"
      type="button"
      onClick={() => onToggleTask(task.id)}
      title={task.completed ? "Reabrir tarea" : "Marcar como hecha"}
      aria-label={`${task.completed ? "Reabrir" : "Completar"}: ${task.title}`}
    >
      <div className="dashboard-page__todo-check-inner" />
    </button>

    <div className="dashboard-page__todo-main">
      <h5 className="dashboard-page__todo-item-title">{task.title}</h5>
      <p className="dashboard-page__todo-desc">{task.note || "Sin nota adicional."}</p>
    </div>

    <div className="dashboard-page__todo-side">
      <span className="dashboard-page__todo-chip">{getListChipLabel(task)}</span>
      {showPriorityChip && (
        <span className="dashboard-page__todo-priority-chip">{getPriorityLabel(task.priority)}</span>
      )}
      <span className="material-symbols-outlined dashboard-page__todo-drag">drag_indicator</span>
    </div>
  </article>
);

const TaskListSection = ({ title, count, emptyText, tasks, showPriorityChip = false, onToggleTask }: TaskListSectionProps) => (
  <section className="dashboard-page__section">
    <div className="dashboard-page__todo-header">
      <h4 className="dashboard-page__todo-title">{title}</h4>
      <span className="dashboard-page__todo-badge">{count} TAREAS</span>
    </div>

    {tasks.length === 0 ? (
      <p className="dashboard-page__empty-state">{emptyText}</p>
    ) : (
      <div className="dashboard-page__todo-list">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            showPriorityChip={showPriorityChip}
            onToggleTask={onToggleTask}
          />
        ))}
      </div>
    )}
  </section>
);

export default TaskListSection;
