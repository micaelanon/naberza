import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/ui";
import { DashboardGrid } from "@/components/domain";
import { getDashboardStats, buildDashboardLayout } from "@/lib/dashboard";
import "./home.css";

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

  return (
    <AppShell title="Dashboard">
      <div className="home-page">
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
