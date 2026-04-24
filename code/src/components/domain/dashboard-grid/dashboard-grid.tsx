"use client";

import Link from "next/link";
import type { DashboardGridProps } from "./utils/types";
import "./dashboard-grid.css";

const DashboardGrid = ({ tiles, variant = "primary" }: DashboardGridProps) => {
  return (
    <div className={`dashboard-grid dashboard-grid--${variant}`}>
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="dashboard-tile"
          style={variant === "primary" && tile.color ? { "--accent-color": tile.color } as React.CSSProperties : undefined}
        >
          <span className="material-symbols-outlined dashboard-tile__icon">{tile.icon}</span>
          <div className="dashboard-tile__content">
            <h3 className="dashboard-tile__label">{tile.label}</h3>
            <div className="dashboard-tile__count">{tile.count}</div>
          </div>
          <div className="dashboard-tile__arrow">→</div>
        </Link>
      ))}
    </div>
  );
}

export default DashboardGrid;
