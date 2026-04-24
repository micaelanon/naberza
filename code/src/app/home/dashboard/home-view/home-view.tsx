"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
        <li key={item.entityId} className={`home-live-list__item ${item.attention ? "home-live-list__item--attention" : ""}`}>
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
};

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

function getLiveStatus(live: HomeLiveResponse, t: ReturnType<typeof useTranslations>): HomeLiveStatus {
  if (!live.configured) return { className: "home-page__pill--warn", text: t("app.common.notConfigured") };
  if (live.connected) return { className: "home-page__pill--ok", text: t("app.home.connected") };
  return { className: "home-page__pill--error", text: t("app.home.connectionError") };
}

const HomeSummaryCards = ({ live, total }: HomeSummaryCardsProps): ReactNode  => {
  const t = useTranslations();

  return (
    <section className="home-page__cards">
      <article className="home-page__card">
        <h2>{t("app.home.attentionNow")}</h2>
        <p>{live.overview.attentionItems.length}</p>
        <p className="home-page__muted">{t("app.homeCards.attention")}</p>
      </article>
      <article className="home-page__card">
        <h2>{t("app.home.locks")}</h2>
        <p>{live.overview.locks.length}</p>
        <p className="home-page__muted">{t("app.homeCards.locks")}</p>
      </article>
      <article className="home-page__card">
        <h2>{t("app.home.accessPoints")}</h2>
        <p>{live.overview.accessPoints.length}</p>
        <p className="home-page__muted">{t("app.homeCards.accessPoints")}</p>
      </article>
      <article className="home-page__card">
        <h2>{t("app.home.eventsPending")}</h2>
        <p>{total}</p>
        <p className="home-page__muted">{t("app.homeCards.events")}</p>
      </article>
    </section>
  );
};

const HomeLiveSection = ({ title, subtitle, count, items, empty }: HomeLiveSectionProps): ReactNode  => {
  const t = useTranslations();

  return (
    <section className="home-page__section">
      <div className="home-page__section-header">
        <div>
          <h2>{title}</h2>
          <p className="home-page__muted">{subtitle}</p>
        </div>
        <span className="home-page__muted">{t("app.home.sectionCount", { count })}</span>
      </div>
      <HomeLiveList items={items} empty={empty} />
    </section>
  );
};

const HomeEventsSection = ({ events, total, page, onPageChange }: HomeEventsSectionProps): ReactNode  => {
  const t = useTranslations();
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="home-page__section">
      <div className="home-page__section-header">
        <div>
          <h2>{t("app.home.eventsPending")}</h2>
          <p className="home-page__muted">{t("app.home.eventsPendingMeta")}</p>
        </div>
        <span className="home-page__muted">{t("app.home.eventsPendingTotal", { count: total })}</span>
      </div>
      {events.length === 0 ? (
        <p className="page-empty">{t("app.home.eventsPendingEmpty")}</p>
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
                  <span className="home-event-item__state">{evt.state ?? t("app.home.noState")}</span>
                  <div className="home-event-item__severity">{evt.severity}</div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination currentPage={page} totalItems={events.length} pageSize={PAGE_SIZE} itemLabel={t("app.home.paginationLabel")} onPageChange={onPageChange} />
        </>
      )}
    </section>
  );
};

function useHomeViewData(): UseHomeViewDataResult {
  const t = useTranslations();
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
        setError(err instanceof Error ? err.message : t("app.home.error.load"));
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchHomeViewPayload();
      setEvents(payload.events);
      setTotal(payload.total);
      setLive(payload.live);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.home.error.load"));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  return { events, total, loading, refreshing, error, page, setPage, live, handleRefresh };
}

const HomeView = (): ReactNode  => {
  const t = useTranslations();
  const { events, total, loading, refreshing, error, page, setPage, live, handleRefresh } = useHomeViewData();
  const liveStatus = useMemo(() => getLiveStatus(live, t), [live, t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container home-page">
      <header className="home-page__header">
        <div>
          <h1>{t("app.home.title")}</h1>
          <p className="home-page__subtitle">{t("app.home.subtitle")}</p>
        </div>
        <div className="home-page__actions">
          <span className={`home-page__pill ${liveStatus.className}`}>{liveStatus.text}</span>
          <button className="home-page__refresh" onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? t("app.home.refreshing") : t("app.home.refresh")}
          </button>
        </div>
      </header>

      <HomeSummaryCards live={live} total={total} />

      {!live.configured && (
        <section className="home-page__section">
          <h2>{t("app.home.configMissingTitle")}</h2>
          <p className="home-page__muted">{t("app.home.configMissingBody")}</p>
        </section>
      )}

      {live.configured && !live.connected && (
        <section className="home-page__section">
          <h2>{t("app.home.liveErrorTitle")}</h2>
          <p className="home-page__muted">{live.error ?? t("app.home.liveErrorBody")}</p>
        </section>
      )}

      <HomeLiveSection
        title={t("app.home.attentionImmediate")}
        subtitle={t("app.home.urgentSubtitle")}
        count={live.overview.attentionItems.length}
        items={live.overview.attentionItems}
        empty={t("app.home.urgentEmpty")}
      />

      <HomeLiveSection
        title={t("app.home.locksAndAccess")}
        subtitle={t("app.homeLocks.subtitle")}
        count={live.overview.locks.length}
        items={live.overview.locks}
        empty={t("app.homeLocks.empty")}
      />

      <HomeLiveSection
        title={t("app.home.accessRelevant")}
        subtitle={t("app.homeAccess.subtitle")}
        count={live.overview.accessPoints.length}
        items={live.overview.accessPoints}
        empty={t("app.homeAccess.empty")}
      />

      <HomeLiveSection
        title={t("app.home.signalsUseful")}
        subtitle={t("app.home.usefulSignalsSubtitle")}
        count={live.overview.sensors.length}
        items={live.overview.sensors}
        empty={t("app.home.usefulSignalsEmpty")}
      />

      <HomeEventsSection events={events} total={total} page={page} onPageChange={setPage} />
    </div>
  );
};

export default HomeView;
