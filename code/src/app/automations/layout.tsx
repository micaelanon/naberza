import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function AutomationsLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Automaciones">{children}</AppShell>;
}
