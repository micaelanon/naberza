export interface FinanceErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
