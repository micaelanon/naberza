export interface UsersErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}
