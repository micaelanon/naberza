import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const IntegrationsLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Integraciones">{children}</AppShell>;
}

export default IntegrationsLayout;
