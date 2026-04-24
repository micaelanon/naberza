"use client";
import type { UsersErrorProps } from "./utils/types";

export default function UsersError({ error, reset }: UsersErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load users</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
