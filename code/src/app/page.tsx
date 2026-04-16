import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { DashboardGrid } from "@/components/domain";
import { getDashboardStats, buildDashboardLayout } from "@/lib/dashboard";
import "./home.css";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="home-page">
        <div className="home-page__hero">
          <h1 className="home-page__title">Naberza OS</h1>
          <p className="home-page__subtitle">Your personal operations system</p>
          <p className="home-page__description">
            Centralized inbox, task management, document handling, home automation, and financial tracking.
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
    <div className="home-page">
      <header className="home-page__header">
        <h1 className="home-page__title">Dashboard</h1>
        <p className="home-page__subtitle">Bienvenido, {session.user?.email}</p>
      </header>

      <section className="home-page__section">
        <h2 className="home-page__section-title">Prioridades</h2>
        <DashboardGrid tiles={layout.primary} variant="primary" />
      </section>

      <section className="home-page__section">
        <h2 className="home-page__section-title">Módulos</h2>
        <DashboardGrid tiles={layout.secondary} variant="secondary" />
      </section>
    </div>
  );
}
