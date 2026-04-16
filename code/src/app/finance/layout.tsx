import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function FinanceLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Finanzas">{children}</AppShell>;
}
