import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const InvoicesLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Facturas">{children}</AppShell>;
}

export default InvoicesLayout;
