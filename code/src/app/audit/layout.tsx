import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function AuditLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Auditoría">{children}</AppShell>;
}
