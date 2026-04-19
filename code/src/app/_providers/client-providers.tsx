"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
