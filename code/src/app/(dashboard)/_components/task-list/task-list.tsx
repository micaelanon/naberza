import TaskCard from "../task-card";
import type { TaskListProps } from "./utils/types";
import "./task-list.css";

export default function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
