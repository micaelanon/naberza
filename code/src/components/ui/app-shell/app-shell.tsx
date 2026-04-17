import type { AppShellProps } from "./utils/types";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";
import "./app-shell.css";

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Topbar title={title} />
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  );
}
