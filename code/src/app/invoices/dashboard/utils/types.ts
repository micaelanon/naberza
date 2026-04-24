export interface InvoicesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
