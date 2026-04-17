import { getAppVersion } from "@/lib/app-version";

export default function SidebarVersion() {
  const version = getAppVersion();

  return (
    <div className="sidebar__version">
      <span className="sidebar__version-label">v{version}</span>
    </div>
  );
}
