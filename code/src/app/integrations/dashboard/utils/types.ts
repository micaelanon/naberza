export interface IntegrationsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
