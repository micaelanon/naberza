"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { Toast, ToastContextValue, ToastKind } from "./utils/types";
import "./toast.css";

const TOAST_DURATION_MS = 3500;
const MAX_TOASTS = 5;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function generateId(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0].toString(36);
}

const ICONS: Record<ToastKind, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }): ReactNode  => {
  const t = useTranslations();
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div className={`toast toast--${toast.kind}${exiting ? " toast--exit" : ""}`} role="status" aria-live="polite">
      <span className="material-symbols-outlined toast__icon">{ICONS[toast.kind]}</span>
      <span className="toast__message">{toast.message}</span>
      <button className="toast__close" onClick={dismiss} aria-label={t("app.toast.close")}>✕</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    idRef.current += 1;
    const id = `${idRef.current}-${generateId()}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, kind }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
