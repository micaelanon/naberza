import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const FinanceLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Finanzas">{children}</AppShell>;
}

export default FinanceLayout;
