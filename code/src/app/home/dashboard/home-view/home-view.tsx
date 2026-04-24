"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pagination } from "@/components/ui";
import type { HomeEventSummary } from "@/modules/home";

import type {
  HomeEventsSectionProps,
  HomeLiveListProps,
  HomeLiveResponse,
  HomeLiveSectionProps,
  HomeLiveStatus,
  HomeSummaryCardsProps,
  HomeViewPayload,
  UseHomeViewDataResult,
} from "./utils/types";
import "./home-view.css";

const PAGE_SIZE = 10;

function formatRelativeDate(value: string | Date | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HomeLiveList = ({ items, empty }: HomeLiveListProps): ReactNode  => {
  if (items.length === 0) return <p className="home-live-list__empty">{empty}</p>;

  return (
    <ul className="home-live-list">
      {items.map((item) => (
        <li
          key={item.entityId}
          className={`home-live-list__item ${item.attention ? "home-live-list__item--attention" : ""}`}
        >
          <div>
            <div className="home-live-list__title">{item.name}</div>
            <div className="home-live-list__meta">{item.entityId}</div>
            {item.attentionReason && <div className="home-live-list__reason">{item.attentionReason}</div>}
          </div>
          <div>
            <div className="home-live-list__state">{item.displayState}</div>
            <div className="home-live-list__meta">{formatRelativeDate(item.lastChanged)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function createInitialLive(): HomeLiveResponse {
  return {
    configured: false,
    connected: null,
    overview: {
      generatedAt: new Date().toISOString(),
      totalStates: 0,
      attentionItems: [],
      locks: [],
      accessPoints: [],
      sensors: [],
    },
  };
}

async function fetchHomeViewPayload(): Promise<HomeViewPayload> {
  const [eventsResponse, liveResponse] = await Promise.all([
    fetch("/home/api/events?acknowledged=false&limit=20", { cache: "no-store" }),
    fetch("/home/api/live", { cache: "no-store" }),
  ]);

  if (!eventsResponse.ok) throw new Error("No se pudieron cargar los eventos de Home");
  if (!liveResponse.ok) throw new Error("No se pudo consultar Home Assistant");

  const eventsBody = (await eventsResponse.json()) as { data: HomeEventSummary[]; total: number };
  const liveBody = (await liveResponse.json()) as HomeLiveResponse;

  return {
    events: eventsBody.data,
    total: eventsBody.total,
    live: liveBody,
  };
}

function getLiveStatus(live: HomeLiveResponse): HomeLiveStatus {
  if (!live.configured) return { className: "home-page__pill--warn", text: "Sin configurar" };
  if (live.connected) return { className: "home-page__pill--ok", text: "Conectado" };
  return { className: "home-page__pill--error", text: "Error de conexión" };
}

const HomeSummaryCards = ({ live, total }: HomeSummaryCardsProps): ReactNode  => {
  return (
    <section className="home-page__cards">
      <article className="home-page__card">
        <h2>Atención ahora</h2>
        <p>{live.overview.attentionItems.length}</p>
        <p className="home-page__muted">Elementos de acceso o sensores con estado que conviene revisar.</p>
      </article>
      <article className="home-page__card">
        <h2>Cerraduras</h2>
        <p>{live.overview.locks.length}</p>
        <p className="home-page__muted">Incluye Nuki, Fermax u otras entidades del dominio `lock`.</p>
      </article>
      <article className="home-page__card">
        <h2>Puntos de acceso</h2>
        <p>{live.overview.accessPoints.length}</p>
        <p className="home-page__muted">Puertas, aperturas, conectividad y sensores binarios relevantes.</p>
      </article>
      <article className="home-page__card">
        <h2>Eventos pendientes</h2>
        <p>{total}</p>
        <p className="home-page__muted">Historial interno de eventos de Home aún sin reconocer.</p>
      </article>
    </section>
  );
}

const HomeLiveSection = ({ title, subtitle, count, items, empty }: HomeLiveSectionProps): ReactNode  => {
  return (
    <section className="home-page__section">
      <div className="home-page__section-header">
        <div>
          <h2>{title}</h2>
          <p className="home-page__muted">{subtitle}</p>
        </div>
        <span className="home-page__muted">{count} elementos</span>
      </div>
      <HomeLiveList items={items} empty={empty} />
    </section>
  );
}

const HomeEventsSection = ({ events, total, page, onPageChange }: HomeEventsSectionProps): ReactNode  => {
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="home-page__section">
      <div className="home-page__section-header">
        <div>
          <h2>Eventos pendientes</h2>
          <p className="home-page__muted">Persistencia interna de eventos del módulo Home.</p>
        </div>
        <span className="home-page__muted">{total} pendientes</span>
      </div>
      {events.length === 0 ? (
        <p className="page-empty">No hay eventos pendientes.</p>
      ) : (
        <>
          <ul className="home-event-list">
            {paginatedEvents.map((evt) => (
              <li key={evt.id} className={`home-event-item home-event-item--${evt.severity.toLowerCase()}`}>
                <div>
                  <span className="home-event-item__entity">{evt.entityId}</span>
                  <div className="home-page__muted">{evt.eventType}</div>
                </div>
                <div>
                  <span className="home-event-item__state">{evt.state ?? "Sin estado"}</span>
                  <div className="home-event-item__severity">{evt.severity}</div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            currentPage={page}
            totalItems={events.length}
            pageSize={PAGE_SIZE}
            itemLabel="eventos"
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  );
}

function useHomeViewData(): UseHomeViewDataResult {
  const [events, setEvents] = useState<HomeEventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [live, setLive] = useState<HomeLiveResponse>(createInitialLive());

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await fetchHomeViewPayload();
        if (!active) return;

        setEvents(payload.events);
        setTotal(payload.total);
        setLive(payload.live);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error al cargar Home");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const payload = await fetchHomeViewPayload();
      setEvents(payload.events);
      setTotal(payload.total);
      setLive(payload.live);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar Home");
    } finally {
      setRefreshing(false);
    }
  };

  return { events, total, loading, refreshing, error, page, setPage, live, handleRefresh };
}

const HomeView = (): ReactNode  => {
  const { events, total, loading, refreshing, error, page, setPage, live, handleRefresh } = useHomeViewData();
  const liveStatus = getLiveStatus(live);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container home-page">
      <header className="home-page__header">
        <div>
          <h1>Home</h1>
          <p className="home-page__subtitle">
            Vista viva de accesos y señales relevantes desde Home Assistant, más el historial interno de eventos.
          </p>
        </div>
        <div className="home-page__actions">
          <span className={`home-page__pill ${liveStatus.className}`}>{liveStatus.text}</span>
          <button className="home-page__refresh" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      <HomeSummaryCards live={live} total={total} />

      {!live.configured && (
        <section className="home-page__section">
          <h2>Home Assistant no está configurado en Naberza</h2>
          <p className="home-page__muted">
            Faltan `HOME_ASSISTANT_URL` y/o `HOME_ASSISTANT_TOKEN`. La guía sigue disponible en Integraciones.
          </p>
        </section>
      )}

      {live.configured && !live.connected && (
        <section className="home-page__section">
          <h2>No se pudo consultar Home Assistant</h2>
          <p className="home-page__muted">{live.error ?? "Revisa URL, token o conectividad."}</p>
        </section>
      )}

      <HomeLiveSection
        title="Atención inmediata"
        subtitle="Lo más delicado primero: cierres abiertos, desconexiones o alertas activas."
        count={live.overview.attentionItems.length}
        items={live.overview.attentionItems}
        empty="No hay nada urgente ahora mismo."
      />

      <HomeLiveSection
        title="Cerraduras y accesos"
        subtitle="Estados vivos de cerraduras detectadas en Home Assistant."
        count={live.overview.locks.length}
        items={live.overview.locks}
        empty="No se detectaron cerraduras en Home Assistant."
      />

      <HomeLiveSection
        title="Sensores de acceso relevantes"
        subtitle="Puertas, conectividad y sensores binarios que suelen importar para el día a día."
        count={live.overview.accessPoints.length}
        items={live.overview.accessPoints}
        empty="No hay sensores binarios relevantes detectados."
      />

      <HomeLiveSection
        title="Señales útiles"
        subtitle="Batería, señal y otros sensores que ayudan a detectar problemas antes de que molesten."
        count={live.overview.sensors.length}
        items={live.overview.sensors}
        empty="No hay sensores útiles destacados ahora mismo."
      />

      <HomeEventsSection events={events} total={total} page={page} onPageChange={setPage} />
    </div>
  );
}

export default HomeView;
