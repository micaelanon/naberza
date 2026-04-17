"use client";

interface HomeErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HomeError({ error, reset }: HomeErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load home</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
