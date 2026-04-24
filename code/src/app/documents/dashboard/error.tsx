"use client";
import type { DocumentsErrorProps } from "./utils/types";

const DocumentsError = ({ error, reset }: DocumentsErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load documents</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default DocumentsError;
