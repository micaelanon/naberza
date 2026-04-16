"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./sidebar.css";

const NAV_ITEMS = [
  { id: "home", label: "Dashboard", icon: "grid_view", href: "/" },
  { id: "inbox", label: "Inbox", icon: "inbox", href: "/inbox/dashboard" },
  { id: "tasks", label: "Tareas", icon: "check_circle", href: "/tasks/dashboard" },
  { id: "documents", label: "Documentos", icon: "description", href: "/documents/dashboard" },
  { id: "invoices", label: "Facturas", icon: "receipt_long", href: "/invoices/dashboard" },
  { id: "finance", label: "Finanzas", icon: "account_balance_wallet", href: "/finance/dashboard" },
  { id: "home-module", label: "Casa", icon: "home", href: "/home/dashboard" },
  { id: "ideas", label: "Ideas", icon: "lightbulb", href: "/ideas/dashboard" },
  { id: "automations", label: "Automaciones", icon: "smart_toy", href: "/automations/dashboard" },
  { id: "integrations", label: "Integraciones", icon: "hub", href: "/integrations/dashboard" },
];

const BOTTOM_ITEMS = [
  { id: "audit", label: "Auditoría", icon: "history", href: "/audit/dashboard" },
  { id: "users", label: "Ajustes", icon: "settings", href: "/users/dashboard" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("/dashboard")[0]);
  };

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">⬡</span>
        <span className="sidebar__brand-name">Naberza</span>
      </div>

      <ul className="sidebar__nav" role="list">
        {NAV_ITEMS.map((item) => (
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
        {BOTTOM_ITEMS.map((item) => (
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
    </nav>
  );
}
