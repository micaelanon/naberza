"use client";

interface DocumentsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DocumentsError({ error, reset }: DocumentsErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load documents</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
