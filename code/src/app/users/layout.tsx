import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function UsersLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Ajustes">{children}</AppShell>;
}
