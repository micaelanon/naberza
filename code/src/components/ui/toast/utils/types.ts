export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

export interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}
