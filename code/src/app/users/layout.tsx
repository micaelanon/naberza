import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const UsersLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Ajustes">{children}</AppShell>;
}

export default UsersLayout;
