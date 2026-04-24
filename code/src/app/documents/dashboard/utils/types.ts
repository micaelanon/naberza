export interface DocumentsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
