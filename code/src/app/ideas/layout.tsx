import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const IdeasLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Ideas">{children}</AppShell>;
}

export default IdeasLayout;
