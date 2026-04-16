import { isSupabaseEnabled } from "@/lib/supabase-client";

import { DashboardSidebarProps, NAV_ITEMS } from "./utils/types";
import "./dashboard-sidebar.css";

const DashboardSidebar = ({ activeView, onSelectView }: DashboardSidebarProps) => (
  <aside className="dashboard-page__sidebar">
    <div className="dashboard-page__brand-block">
      <h1 className="dashboard-page__brand">
        <span className="material-symbols-outlined dashboard-page__brand-icon">leaf</span>
        naBerza
      </h1>
      <p className="dashboard-page__brand-subtitle">Espabila a troita</p>
      <p className="dashboard-page__brand-meta">
        {isSupabaseEnabled ? "Supabase activo" : "Modo local"}
      </p>
    </div>

    <nav className="dashboard-page__nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={[
            "dashboard-page__nav-item",
            activeView === item.key ? "dashboard-page__nav-item--active" : "",
          ].filter(Boolean).join(" ")}
          type="button"
          onClick={() => onSelectView(item.key)}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>

    <div className="dashboard-page__sidebar-spacer" />

    <div className="dashboard-page__profile">
      <div className="dashboard-page__avatar" />
      <div>
        <p className="dashboard-page__profile-name">Panel personal</p>
        <p className="dashboard-page__profile-meta">Base operativa v1</p>
      </div>
    </div>
  </aside>
);

export default DashboardSidebar;
