import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function TasksLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Tareas">{children}</AppShell>;
}
