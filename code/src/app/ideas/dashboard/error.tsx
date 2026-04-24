"use client";
import type { IdeasErrorProps } from "./utils/types";

const IdeasError = ({ error, reset }: IdeasErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load ideas</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default IdeasError;
