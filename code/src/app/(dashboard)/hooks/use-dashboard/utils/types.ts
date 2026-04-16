import type { DashboardView, TaskCollections, TaskFormState, ViewMeta } from "@/types/dashboard.types";
import type { TaskItem } from "@/lib/tasks";

export interface UseDashboardReturn {
  tasks: TaskItem[];
  loading: boolean;
  activeView: DashboardView;
  isCreateOpen: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  form: TaskFormState;
  todayLabel: string;
  collections: TaskCollections;
  activeTasks: TaskItem[];
  showPersistentRail: boolean;
  showPendingList: boolean;
  viewMeta: ViewMeta;
  showDiscardModal: boolean;
  handleSelectView: (view: DashboardView) => void;
  handleToggleTask: (taskId: string) => Promise<void>;
  handleToggleCreate: () => void;
  handleFormChange: <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => void;
  handleCreateTask: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleCancelCreate: () => void;
  handleConfirmDiscard: () => void;
  handleCancelDiscard: () => void;
}
