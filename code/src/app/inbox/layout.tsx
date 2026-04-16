import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function InboxLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell title="Inbox">{children}</AppShell>;
}
