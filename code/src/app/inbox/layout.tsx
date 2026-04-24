import { ReactNode } from "react";
import { AppShell } from "@/components/ui";

const InboxLayout = ({ children }: { children: ReactNode }): ReactNode  => {
  return <AppShell title="Inbox">{children}</AppShell>;
}

export default InboxLayout;
