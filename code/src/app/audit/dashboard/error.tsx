"use client";
import type { AuditErrorProps } from "./utils/types";

const AuditError = ({ error, reset }: AuditErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load audit log</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default AuditError;
