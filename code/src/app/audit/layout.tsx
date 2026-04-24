import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const AuditLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Auditoría">{children}</AppShell>;
}

export default AuditLayout;
