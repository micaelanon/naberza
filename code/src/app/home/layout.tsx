import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const HomeModuleLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Casa">{children}</AppShell>;
}

export default HomeModuleLayout;
