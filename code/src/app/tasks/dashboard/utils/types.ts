export interface TasksErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
