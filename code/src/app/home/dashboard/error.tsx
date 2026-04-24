"use client";
import type { HomeErrorProps } from "./utils/types";

const HomeError = ({ error, reset }: HomeErrorProps) => {
  return (
    <div className="page-error">
      <h2>Failed to load home</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default HomeError;
