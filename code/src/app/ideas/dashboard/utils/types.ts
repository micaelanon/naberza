export interface IdeasErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
