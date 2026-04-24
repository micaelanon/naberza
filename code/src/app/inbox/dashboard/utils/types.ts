export interface InboxErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
