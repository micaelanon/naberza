// Shared UI components barrel
export { default as Sidebar } from "./sidebar";
export { default as Topbar } from "./topbar";
export { default as AppShell } from "./app-shell";
export { ConfirmDeleteModal } from "./confirm-delete-modal";
export type { ConfirmDeleteModalProps } from "./confirm-delete-modal";
export { ToastProvider, useToast } from "./toast";
export type { Toast, ToastKind } from "./toast";
// Pure presentational components live in subdirectories here
// e.g.: import Button from "@/components/ui/button"
export { Pagination } from "./pagination";
export type { PaginationProps } from "./pagination";
