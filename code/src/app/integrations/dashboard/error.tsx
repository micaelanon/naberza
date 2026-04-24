"use client";
import type { IntegrationsErrorProps } from "./utils/types";

const IntegrationsError = ({ error, reset }: IntegrationsErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load integrations</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default IntegrationsError;
