"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

const ClientProviders = ({ children }: { children: ReactNode }) => {
  return <ToastProvider>{children}</ToastProvider>;
}

export default ClientProviders;
