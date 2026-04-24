import type { SidebarVersionProps } from "@/components/ui/sidebar/utils/types";

const SidebarVersion = ({ versionLabel }: SidebarVersionProps) => {
  return (
    <div className="sidebar__version">
      <span className="sidebar__version-label">{versionLabel}</span>
    </div>
  );
}

export default SidebarVersion;
