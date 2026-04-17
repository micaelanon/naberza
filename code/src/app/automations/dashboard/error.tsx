"use client";

interface AutomationsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AutomationsError({ error, reset }: AutomationsErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load automations</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
