export interface HomeErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
