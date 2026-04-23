export interface AutomationsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
