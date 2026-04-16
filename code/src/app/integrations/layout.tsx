import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function IntegrationsLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Integraciones">{children}</AppShell>;
}
