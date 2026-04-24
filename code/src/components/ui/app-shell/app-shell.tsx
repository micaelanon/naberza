import type { AppShellProps } from "./utils/types";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";
import { getAppVersionLabel } from "@/lib/app-version";
import "./app-shell.css";

const AppShell = ({ children, title }: AppShellProps) => {
  const versionLabel = getAppVersionLabel();

  return (
    <div className="app-shell">
      <Sidebar versionLabel={versionLabel} />
      <div className="app-shell__main">
        <Topbar title={title} />
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  );
}

export default AppShell;
