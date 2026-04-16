import type { TaskFormState } from "@/types/dashboard.types";

export interface CreateTaskPanelProps {
  form: TaskFormState;
  submitError: string | null;
  isSubmitting: boolean;
  onChange: <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}
