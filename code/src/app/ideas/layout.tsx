import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function IdeasLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Ideas">{children}</AppShell>;
}
