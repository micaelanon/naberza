import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/ui";
import { getDashboardStats } from "@/lib/dashboard";
import { getActionDigest } from "@/lib/dashboard/action-digest";
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
    { label: "documentos", value: stats.documentsTotal, urgent: false },
    ...(stats.approvalsPending > 0
      ? [{ label: "aprobaciones", value: stats.approvalsPending, urgent: true }]
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

function DigestSection({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; href: string; tone?: "default" | "warning" | "urgent" }>;
}) {
  return (
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

  const [stats, digest] = await Promise.all([
    getDashboardStats(),
    getActionDigest(),
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

        <DigestSection
          title="Señales útiles"
          empty="Aún no hay señales útiles destacables."
          items={digest.usefulSignals}
        />
      </div>
    </AppShell>
  );
}
