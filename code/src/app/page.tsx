import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { ROUTE_PATHS } from "@/lib/constants";
import type { ActionDigestItem } from "@/lib/dashboard/action-digest";
import { getActionDigest } from "@/lib/dashboard/action-digest";
import { getDashboardStats } from "@/lib/dashboard";
import type { DashboardStats } from "@/lib/dashboard/dashboard.types";
import { getCodexUsage } from "@/lib/dashboard/codex-usage";
import type { CodexUsage } from "@/lib/dashboard/codex-usage";
import "./home.css";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

interface SummaryCard {
  id: string;
  href: string;
  label: string;
  value: string;
  meta: string;
  urgent: boolean;
}

interface SummaryGridProps {
  items: SummaryCard[];
}

interface DigestSectionProps {
  title: string;
  empty: string;
  items: ActionDigestItem[];
}

function getGreeting(t: Translator): string {
  const hour = new Date().getHours();

  if (hour < 14) return t("app.dashboardHome.greeting.morning");
  if (hour < 21) return t("app.dashboardHome.greeting.afternoon");
  return t("app.dashboardHome.greeting.night");
}

function extractOverdueInvoiceCount(items: ActionDigestItem[]): number {
  const overdueItem = items.find((item) => item.id.startsWith("invoice-overdue-"));
  if (!overdueItem) return 0;

  const match = overdueItem.title.match(/\d+/u);
  if (!match) return 0;

  return Number(match[0]);
}

function getTasksMeta(stats: DashboardStats, t: Translator): string {
  if (stats.tasksDueToday > 0) {
    return t("app.dashboardHome.summary.tasksMetaDueToday", { count: stats.tasksDueToday });
  }

  return t("app.dashboardHome.summary.tasksMetaPending");
}

function getInvoicesMeta(overdueCount: number, t: Translator): string {
  if (overdueCount > 0) {
    return t("app.dashboardHome.summary.invoicesMetaOverdue", { count: overdueCount });
  }

  return t("app.dashboardHome.summary.invoicesMetaUnpaid");
}

function getCodexMeta(codex: CodexUsage, t: Translator): string {
  if (codex.primaryWindow.usedPercent >= codex.secondaryWindow.usedPercent) {
    return t("app.dashboardHome.summary.codexMetaPrimary");
  }

  return t("app.dashboardHome.summary.codexMetaSecondary");
}

function buildSummaryCards({
  stats,
  digestFocus,
  codex,
  t,
}: {
  stats: DashboardStats;
  digestFocus: ActionDigestItem[];
  codex: CodexUsage | null;
  t: Translator;
}): SummaryCard[] {
  const overdueCount = extractOverdueInvoiceCount(digestFocus);

  const cards: SummaryCard[] = [
    {
      id: "inbox",
      href: ROUTE_PATHS.INBOX,
      label: t("app.dashboardHome.summary.inboxLabel"),
      value: String(stats.inboxPending),
      meta: t("app.dashboardHome.summary.inboxMeta"),
      urgent: false,
    },
    {
      id: "tasks",
      href: ROUTE_PATHS.TASKS,
      label: t("app.dashboardHome.summary.tasksLabel"),
      value: String(stats.tasksPending),
      meta: getTasksMeta(stats, t),
      urgent: stats.tasksDueToday > 0,
    },
    {
      id: "invoices",
      href: ROUTE_PATHS.INVOICES,
      label: t("app.dashboardHome.summary.invoicesLabel"),
      value: String(stats.invoicesUnpaid),
      meta: getInvoicesMeta(overdueCount, t),
      urgent: overdueCount > 0,
    },
    {
      id: "subscriptions",
      href: ROUTE_PATHS.SUBSCRIPTIONS,
      label: t("app.dashboardHome.summary.subscriptionsLabel"),
      value: String(stats.subscriptionsActive),
      meta: t("app.dashboardHome.summary.subscriptionsMeta"),
      urgent: false,
    },
  ];

  if (!codex) {
    return cards;
  }

  const worstPct = Math.max(codex.primaryWindow.usedPercent, codex.secondaryWindow.usedPercent);

  cards.push({
    id: "codex",
    href: ROUTE_PATHS.HOME,
    label: t("app.dashboardHome.summary.codexLabel"),
    value: `${Math.round(worstPct)}%`,
    meta: getCodexMeta(codex, t),
    urgent: worstPct >= 60,
  });

  return cards;
}

function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <div className="stats-grid">
      {items.map((item) => {
        const cardClassName = item.urgent ? "stats-card stats-card--urgent" : "stats-card";
        const valueClassName = item.urgent ? "stats-card__value stats-card__value--urgent" : "stats-card__value";

        return (
          <a key={item.id} href={item.href} className={cardClassName}>
            <span className="stats-card__label">{item.label}</span>
            <div className={valueClassName}>{item.value}</div>
            <div className="stats-card__meta">{item.meta}</div>
          </a>
        );
      })}
    </div>
  );
}

function DigestSection({ title, empty, items }: DigestSectionProps) {
  return (
    <section className="digest-section">
      <h2 className="digest-section__title">{title}</h2>
      {items.length === 0 ? (
        <p className="page-empty">{empty}</p>
      ) : (
        <div className="digest-list">
          {items.map((item) => {
            const toneClassName = item.tone ? ` digest-card--${item.tone}` : "";
            const ctaClassName = item.id === "triage-cta" ? " digest-card--cta" : "";
            const className = `digest-card${toneClassName}${ctaClassName}`;

            return (
              <a key={item.id} href={item.href} className={className}>
                <div className="digest-card__title">{item.title}</div>
                {item.id !== "triage-cta" && (
                  <div className="digest-card__detail">{item.detail}</div>
                )}
                {item.id === "triage-cta" && (
                  <span className="digest-card__arrow" aria-hidden="true">›</span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

const HomePage = async () => {
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations({ locale: "es" }),
  ]);

  if (!session) {
    return (
      <div className="home-page home-page--guest">
        <div className="home-page__hero">
          <span className="material-symbols-outlined home-page__hero-icon" aria-hidden="true">dashboard</span>
          <h1 className="home-page__title">{t("app.dashboardHome.guest.title")}</h1>
          <p className="home-page__subtitle">{t("app.dashboardHome.guest.subtitle")}</p>
          <p className="home-page__description">{t("app.dashboardHome.guest.description")}</p>
          <a href={ROUTE_PATHS.LOGIN} className="home-page__cta">
            {t("app.dashboardHome.guest.cta")}
          </a>
        </div>
      </div>
    );
  }

  const [stats, digest, codex] = await Promise.all([
    getDashboardStats(),
    getActionDigest(),
    getCodexUsage(),
  ]);

  const summaryCards = buildSummaryCards({
    stats,
    digestFocus: digest.focus,
    codex,
    t,
  });
  const usefulSignals = [
    {
      id: "triage-cta",
      title: t("app.dashboardHome.triageCta"),
      detail: t("app.dashboardHome.triageCtaDetail"),
      href: ROUTE_PATHS.EMAIL_TRIAGE,
    },
    ...digest.usefulSignals,
  ];

  return (
    <AppShell title={t("app.dashboardHome.shellTitle")}>
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">
            {getGreeting(t)}, {session.user?.name ?? t("app.dashboardHome.userFallback")}
          </h1>
          <p className="home-page__subtitle">{t("app.dashboardHome.subtitle")}</p>
          <SummaryGrid items={summaryCards} />
        </div>

        <DigestSection
          title={t("app.dashboardHome.sections.focus")}
          empty={t("app.dashboardHome.empty.focus")}
          items={digest.focus}
        />

        <DigestSection
          title={t("app.dashboardHome.sections.needsAction")}
          empty={t("app.dashboardHome.empty.needsAction")}
          items={digest.needsAction}
        />

        <DigestSection
          title={t("app.dashboardHome.sections.usefulSignals")}
          empty={t("app.dashboardHome.empty.usefulSignals")}
          items={usefulSignals}
        />
      </div>
    </AppShell>
  );
};

export default HomePage;
