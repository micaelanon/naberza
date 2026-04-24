import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const TasksLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Tareas">{children}</AppShell>;
}

export default TasksLayout;
