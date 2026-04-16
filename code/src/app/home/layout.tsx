import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function HomeModuleLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Casa">{children}</AppShell>;
}
