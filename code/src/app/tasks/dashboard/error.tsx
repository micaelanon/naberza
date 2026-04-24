"use client";
import type { TasksErrorProps } from "./utils/types";

export default function TasksError({ error, reset }: TasksErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load tasks</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
