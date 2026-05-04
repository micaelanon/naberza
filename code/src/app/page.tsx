import { getServerSession } from "next-auth";

import { AppShell } from "@/components/ui";
import { ROUTE_PATHS } from "@/lib/constants";
import { authOptions } from "@/lib/auth";
import { getActionDigest } from "@/lib/dashboard/action-digest";
import { getDashboardStats } from "@/lib/dashboard";
import { getCodexUsage } from "@/lib/dashboard/codex-usage";
import type { DashboardStats } from "@/lib/dashboard/dashboard.types";
import type { CodexUsage } from "@/lib/dashboard/codex-usage";
import "./home.css";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

function formatResetCountdown(seconds: number): string {
  if (seconds < 60) return "menos de 1 minuto";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return `${minutes}min`;
}

function getWindowColorClass(pct: number): string {
  if (pct >= 85) return "codex-window--critical";
  if (pct >= 60) return "codex-window--warning";
  return "codex-window--ok";
}

const CodexWidget = ({ usage }: { usage: CodexUsage }) => {
  const worstPct = Math.max(usage.primaryWindow.usedPercent, usage.secondaryWindow.usedPercent);
  const statusClass = getWindowColorClass(worstPct);
  let statusText = "Codex disponible";
  if (worstPct >= 85) {
    const resetIn = Math.min(usage.primaryWindow.resetAfterSeconds, usage.secondaryWindow.resetAfterSeconds);
    statusText = `Límite alcanzado · Reset en ${formatResetCountdown(resetIn)}`;
  } else if (worstPct >= 60) {
    statusText = "Codex próximo al límite · Úsalo con moderación";
  }

  return (
    <section className="codex-widget">
      <div className={`codex-widget__status ${statusClass}`}>{statusText}</div>
      <div className="codex-widget__windows">
        <div className="codex-widget__window">
          <div className="codex-widget__window-label">Ventana 5h</div>
          <div className="codex-widget__bar-track">
            <div
              className={`codex-widget__bar-fill ${getWindowColorClass(usage.primaryWindow.usedPercent)}`}
              style={{ width: `${Math.min(usage.primaryWindow.usedPercent, 100)}%` }}
            />
          </div>
          <div className="codex-widget__window-meta">
            <span>{Math.round(usage.primaryWindow.usedPercent)}%</span>
            <span>Reset en {formatResetCountdown(usage.primaryWindow.resetAfterSeconds)}</span>
          </div>
        </div>
        <div className="codex-widget__window">
          <div className="codex-widget__window-label">Ventana semanal</div>
          <div className="codex-widget__bar-track">
            <div
              className={`codex-widget__bar-fill ${getWindowColorClass(usage.secondaryWindow.usedPercent)}`}
              style={{ width: `${Math.min(usage.secondaryWindow.usedPercent, 100)}%` }}
            />
          </div>
          <div className="codex-widget__window-meta">
            <span>{Math.round(usage.secondaryWindow.usedPercent)}%</span>
            <span>Reset en {formatResetCountdown(usage.secondaryWindow.resetAfterSeconds)}</span>
          </div>
        </div>
      </div>
      <div className="codex-widget__footer">
        <span>{usage.planType} · {usage.userEmail}</span>
      </div>
    </section>
  );
};

const StatsBar = ({ stats }: { stats: DashboardStats }) => {
  const items = [
    { label: "inbox", value: stats.inboxPending, urgent: stats.inboxPending > 10, href: ROUTE_PATHS.INBOX },
    { label: "tareas", value: stats.tasksPending, urgent: stats.tasksDueToday > 0, href: ROUTE_PATHS.TASKS },
    { label: "vencen hoy", value: stats.tasksDueToday, urgent: stats.tasksDueToday > 0, href: ROUTE_PATHS.TASKS },
    { label: "facturas sin pagar", value: stats.invoicesUnpaid, urgent: stats.invoicesUnpaid > 0, href: ROUTE_PATHS.INVOICES },
    ...(stats.approvalsPending > 0
      ? [{ label: "aprobaciones", value: stats.approvalsPending, urgent: true, href: ROUTE_PATHS.AUTOMATIONS }]
      : []),
    ...(stats.homeAlerts > 0
      ? [{ label: "alertas hogar", value: stats.homeAlerts, urgent: true, href: ROUTE_PATHS.HOME }]
      : []),
  ];

  return (
    <div className="stats-bar">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={`stats-bar__item${item.urgent ? " stats-bar__item--urgent" : ""}`}
        >
          <span className="stats-bar__value">{item.value}</span>
          <span className="stats-bar__label">{item.label}</span>
        </a>
      ))}
    </div>
  );
};

const DigestSection = ({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; href: string; tone?: "default" | "warning" | "urgent" }>;
}) => (
  <section className="digest-section">
    <h2 className="home-page__section-title">{title}</h2>
    {items.length === 0 ? (
      <p className="page-empty">{empty}</p>
    ) : (
      <div className="digest-list">
        {items.map((item) => {
          const className = item.tone ? `digest-card digest-card--${item.tone}` : "digest-card";
          return (
            <a key={item.id} href={item.href} className={className}>
              <div className="digest-card__title">{item.title}</div>
              <div className="digest-card__detail">{item.detail}</div>
            </a>
          );
        })}
      </div>
    )}
  </section>
);

const HomePage = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="home-page home-page--guest">
        <div className="home-page__hero">
          <h1 className="home-page__title">Naberza OS</h1>
          <p className="home-page__subtitle">Tu sistema operativo personal</p>
          <p className="home-page__description">
            Inbox centralizado, tareas, documentos, automatización del hogar y control financiero.
          </p>
          <a href={ROUTE_PATHS.LOGIN} className="home-page__cta">
            Entrar
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
  const greeting = getGreeting();

  return (
    <AppShell title="Hoy">
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">{greeting}, {session.user?.name ?? "usuario"}</h1>
          <p className="home-page__subtitle">Esto es lo que merece tu atención ahora mismo.</p>
          <StatsBar stats={stats} />
        </div>

        {codex && <CodexWidget usage={codex} />}

        <DigestSection
          title="Foco ahora"
          empty="No hay nada urgente detectado ahora mismo."
          items={digest.focus}
        />

        <DigestSection
          title="Requiere acción"
          empty="No hay nada pendiente de clasificar o revisar con prioridad."
          items={digest.needsAction}
        />

        {digest.usefulSignals.length > 0 && (
          <DigestSection
            title="Señales útiles"
            empty=""
            items={digest.usefulSignals}
          />
        )}
      </div>
    </AppShell>
  );
};

export default HomePage;
