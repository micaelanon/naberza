"use client";

interface IdeasErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function IdeasError({ error, reset }: IdeasErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load ideas</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
