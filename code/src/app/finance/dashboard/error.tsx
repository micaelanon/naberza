"use client";
import type { FinanceErrorProps } from "./utils/types";

const FinanceError = ({ error, reset }: FinanceErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load finance data</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default FinanceError;
