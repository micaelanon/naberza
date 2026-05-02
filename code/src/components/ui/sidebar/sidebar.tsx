"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { ROUTE_PATHS } from "@/lib/constants";

import { SidebarVersion } from "./sidebar-version";
import type { SidebarProps } from "./utils/types";
import "./sidebar.css";

const Sidebar = ({ versionLabel }: SidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("/dashboard")[0]);
  };

  const navItems = [
    { id: "home", label: t("app.nav.appTitle"), icon: "grid_view", href: "/" },
    { id: "mail-analysis", label: t("app.nav.mail"), icon: "mark_email_unread", href: ROUTE_PATHS.MAIL_ANALYSIS },
    { id: "email-triage", label: t("app.nav.emailTriage"), icon: "inbox", href: ROUTE_PATHS.EMAIL_TRIAGE },
    { id: "tasks", label: t("app.nav.tasks"), icon: "check_circle", href: ROUTE_PATHS.TASKS },
    { id: "documents", label: t("app.nav.documents"), icon: "description", href: ROUTE_PATHS.DOCUMENTS },
    { id: "invoices", label: t("app.nav.invoices"), icon: "receipt_long", href: ROUTE_PATHS.INVOICES },
    { id: "finance", label: t("app.nav.finance"), icon: "account_balance_wallet", href: ROUTE_PATHS.FINANCE },
    { id: "home-module", label: t("app.nav.home"), icon: "home", href: ROUTE_PATHS.HOME },
    { id: "ideas", label: t("app.nav.ideas"), icon: "lightbulb", href: ROUTE_PATHS.IDEAS },
    { id: "automations", label: t("app.nav.automations"), icon: "smart_toy", href: ROUTE_PATHS.AUTOMATIONS },
    { id: "integrations", label: t("app.nav.integrations"), icon: "hub", href: ROUTE_PATHS.INTEGRATIONS },
    { id: "wishlist", label: t("app.nav.wishlist"), icon: "favorite", href: ROUTE_PATHS.WISHLIST },
    { id: "projects", label: t("app.nav.projects"), icon: "folder", href: ROUTE_PATHS.PROJECTS },
    { id: "subscriptions", label: t("app.nav.subscriptions"), icon: "card_membership", href: ROUTE_PATHS.SUBSCRIPTIONS },
  ];

  const bottomItems = [
    { id: "audit", label: t("app.nav.audit"), icon: "history", href: ROUTE_PATHS.AUDIT },
    { id: "users", label: t("app.nav.users"), icon: "settings", href: ROUTE_PATHS.USERS },
  ];

  return (
    <nav className="sidebar" aria-label={t("app.nav.ariaLabel")}>
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
