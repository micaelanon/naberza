"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTE_PATHS } from "@/lib/constants";

import { SidebarVersion } from "./sidebar-version";
import type { SidebarProps } from "./utils/types";
import "./sidebar.css";

const Sidebar = ({ versionLabel }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("/dashboard")[0]);
  };

  const navItems = [
    { id: "home", label: "Dashboard", icon: "grid_view", href: "/" },
    { id: "mail", label: "Correo", icon: "mark_email_unread", href: ROUTE_PATHS.MAIL_ANALYSIS },
    { id: "tasks", label: "Tareas", icon: "check_circle", href: ROUTE_PATHS.TASKS },
    { id: "documents", label: "Documentos", icon: "description", href: ROUTE_PATHS.DOCUMENTS },
    { id: "invoices", label: "Facturas", icon: "receipt_long", href: ROUTE_PATHS.INVOICES },
    { id: "finance", label: "Finanzas", icon: "account_balance_wallet", href: ROUTE_PATHS.FINANCE },
    { id: "home-module", label: "Casa", icon: "home", href: ROUTE_PATHS.HOME },
    { id: "ideas", label: "Ideas", icon: "lightbulb", href: ROUTE_PATHS.IDEAS },
    { id: "automations", label: "Automaciones", icon: "smart_toy", href: ROUTE_PATHS.AUTOMATIONS },
    { id: "integrations", label: "Integraciones", icon: "hub", href: ROUTE_PATHS.INTEGRATIONS },
  ];

  const bottomItems = [
    { id: "audit", label: "Auditoría", icon: "history", href: ROUTE_PATHS.AUDIT },
    { id: "users", label: "Ajustes", icon: "settings", href: ROUTE_PATHS.USERS },
  ];

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">⬡</span>
        <span className="sidebar__brand-name">Naberza</span>
      </div>

      <ul className="sidebar__nav" role="list">
        {navItems.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`sidebar__item ${isActive(item.href) ? "sidebar__item--active" : ""}`}
            >
              <span className="material-symbols-outlined sidebar__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar__item-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="sidebar__bottom" role="list">
        {bottomItems.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`sidebar__item ${isActive(item.href) ? "sidebar__item--active" : ""}`}
            >
              <span className="material-symbols-outlined sidebar__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="sidebar__item-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <SidebarVersion versionLabel={versionLabel} />
    </nav>
  );
};

export default Sidebar;
