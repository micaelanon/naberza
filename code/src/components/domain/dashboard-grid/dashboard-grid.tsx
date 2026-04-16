"use client";

import Link from "next/link";
import type { DashboardTile } from "@/lib/dashboard";
import "./dashboard-grid.css";

interface DashboardGridProps {
  tiles: DashboardTile[];
  variant?: "primary" | "secondary";
}

export default function DashboardGrid({ tiles, variant = "primary" }: DashboardGridProps) {
  return (
    <div className={`dashboard-grid dashboard-grid--${variant}`}>
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="dashboard-tile"
          style={variant === "primary" && tile.color ? { "--accent-color": tile.color } as React.CSSProperties : undefined}
        >
          <div className="dashboard-tile__icon">{tile.icon}</div>
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
