import type { SidebarVersionProps } from "../utils/types";

export default function SidebarVersion({ versionLabel }: SidebarVersionProps) {
  return (
    <div className="sidebar__version">
      <span className="sidebar__version-label">{versionLabel}</span>
    </div>
  );
}
