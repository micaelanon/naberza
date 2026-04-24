import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const AutomationsLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Automaciones">{children}</AppShell>;
}

export default AutomationsLayout;
