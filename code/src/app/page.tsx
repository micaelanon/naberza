import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/ui";
import { DashboardGrid } from "@/components/domain";
import { getDashboardStats, buildDashboardLayout } from "@/lib/dashboard";
import type { DashboardStats } from "@/lib/dashboard/dashboard.types";
import "./home.css";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

function StatsBar({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "inbox pendiente", value: stats.inboxPending, urgent: stats.inboxPending > 10 },
    { label: "tareas", value: stats.tasksPending, urgent: stats.tasksDueToday > 0 },
    { label: "vencen hoy", value: stats.tasksDueToday, urgent: stats.tasksDueToday > 0 },
    { label: "facturas sin pagar", value: stats.invoicesUnpaid, urgent: stats.invoicesUnpaid > 0 },
    { label: "ideas capturadas", value: stats.ideasCaptured, urgent: false },
    ...(stats.approvalsPending > 0
      ? [{ label: "aprobaciones", value: stats.approvalsPending, urgent: true }]
      : []),
    ...(stats.financeAnomalies > 0
      ? [{ label: "anomalías", value: stats.financeAnomalies, urgent: true }]
      : []),
    ...(stats.homeAlerts > 0
      ? [{ label: "alertas del hogar", value: stats.homeAlerts, urgent: true }]
      : []),
  ];

  return (
    <div className="stats-bar">
      {items.map((item) => (
        <div key={item.label} className={`stats-bar__item${item.urgent ? " stats-bar__item--urgent" : ""}`}>
          <span className="stats-bar__value">{item.value}</span>
          <span className="stats-bar__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="home-page home-page--guest">
        <div className="home-page__hero">
          <span className="home-page__hero-icon">⬡</span>
          <h1 className="home-page__title">Naberza OS</h1>
          <p className="home-page__subtitle">Tu sistema operativo personal</p>
          <p className="home-page__description">
            Inbox centralizado, tareas, documentos, automatización del hogar y control financiero.
          </p>
          <a href="/login" className="home-page__cta">
            Entrar
          </a>
        </div>
      </div>
    );
  }

  const stats = await getDashboardStats();
  const layout = buildDashboardLayout(stats);
  const greeting = getGreeting();

  return (
    <AppShell title="Dashboard">
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">{greeting}, {session.user?.name ?? "usuario"}</h1>
          <StatsBar stats={stats} />
        </div>

        <section className="home-page__section">
          <h2 className="home-page__section-title">Prioridades</h2>
          <DashboardGrid tiles={layout.primary} variant="primary" />
        </section>

        <section className="home-page__section">
          <h2 className="home-page__section-title">Módulos</h2>
          <DashboardGrid tiles={layout.secondary} variant="secondary" />
        </section>
      </div>
    </AppShell>
  );
}
