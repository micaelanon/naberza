"use client";

interface UsersErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UsersError({ error, reset }: UsersErrorProps) {
  return (
    <div className="page-error">
      <h2>Failed to load users</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
