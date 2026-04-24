import type { ReactNode } from "react";

import type { InboxClassification, InboxItem, InboxStatus } from "@/modules/inbox/inbox.types";
import type { Priority } from "@/modules/tasks/task.types";

export type StatusTab = "ALL" | InboxStatus;

export interface StatusTabOption {
  value: StatusTab;
  label: string;
}

export interface InboxApiResponse {
  data: InboxItem[];
  meta: { total: number; page: number; pageSize: number };
}

export interface InboxCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export interface InboxEditFormProps {
  item: InboxItem;
  onSaved: () => void;
  onCancel: () => void;
}

export interface InboxListItemProps {
  item: InboxItem;
  onDismiss: (id: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
}

export interface InboxContentProps {
  isLoading: boolean;
  error: string | null;
  items: InboxItem[];
  onDismiss: (id: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
  hasActiveFilters: boolean;
}

export interface InboxEditFormState {
  title: string;
  body: string;
  priority: Priority;
  classification: InboxClassification | "";
}

export interface InboxCreateFormState {
  title: string;
  body: string;
  priority: Priority;
}

export type InboxViewComponent = () => ReactNode;
