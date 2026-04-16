import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function InvoicesLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Facturas">{children}</AppShell>;
}
