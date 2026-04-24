"use client";
import type { InvoicesErrorProps } from "./utils/types";

const InvoicesError = ({ error, reset }: InvoicesErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load invoices</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default InvoicesError;
