import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function DocumentsLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Documentos">{children}</AppShell>;
}
