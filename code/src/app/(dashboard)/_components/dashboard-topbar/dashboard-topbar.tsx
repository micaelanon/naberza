import type { DashboardTopbarProps } from "./utils/types";
import "./dashboard-topbar.css";

const DashboardTopbar = ({ viewMeta, activeView, todayLabel, isCreateOpen, onToggleCreate }: DashboardTopbarProps) => {
  const subtitle = activeView === "today" ? todayLabel : viewMeta.description;

  return (
    <header className="dashboard-page__topbar">
      <div>
        <h2 className="dashboard-page__topbar-title">{viewMeta.title}</h2>
        <p className="dashboard-page__topbar-date">{subtitle}</p>
      </div>
      <div className="dashboard-page__topbar-actions">
        <button className="dashboard-page__primary-button" type="button" onClick={onToggleCreate}>
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
          <span>{isCreateOpen ? "Cerrar" : "Añadir tarea"}</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardTopbar;
