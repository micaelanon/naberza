export interface AuditErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
