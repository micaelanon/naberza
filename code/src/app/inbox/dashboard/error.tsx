"use client";

interface InboxErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InboxError({ error, reset }: InboxErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load inbox</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
