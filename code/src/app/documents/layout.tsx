import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const DocumentsLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Documentos">{children}</AppShell>;
}

export default DocumentsLayout;
