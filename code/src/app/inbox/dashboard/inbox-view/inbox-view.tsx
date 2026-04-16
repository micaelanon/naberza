"use client";

import { useCallback, useEffect, useState } from "react";

import type { InboxItem, InboxStatus } from "@/modules/inbox/inbox.types";
import "./inbox-view.css";

type StatusTab = "ALL" | InboxStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CLASSIFIED", label: "Clasificados" },
  { value: "DISMISSED", label: "Descartados" },
];

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
  NONE: "",
};

const SOURCE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  PAPERLESS: "Paperless",
  HOME_ASSISTANT: "Home",
  MANUAL: "Manual",
  API: "API",
};

interface InboxApiResponse {
  data: InboxItem[];
  meta: { total: number; page: number; pageSize: number };
}

export default function InboxView() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (status: StatusTab) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);

      const response = await fetch(`/inbox/api?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar el inbox");
      }

      const json = (await response.json()) as InboxApiResponse;
      setItems(json.data);
      setTotal(json.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems(activeTab);
  }, [activeTab, fetchItems]);

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/inbox/api/${id}/dismiss`, { method: "POST" });
      if (!response.ok) throw new Error("Error al descartar");
      void fetchItems(activeTab);
    } catch (err) {
      console.error("[InboxView] dismiss error:", err);
    }
  };

  return (
    <div className="inbox-view">
      <header className="inbox-view__header">
        <h1 className="inbox-view__title">Inbox</h1>
        <span className="inbox-view__count">{total} elementos</span>
      </header>

      <nav className="inbox-view__tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`inbox-view__tab ${activeTab === tab.value ? "inbox-view__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="inbox-view__content">
        {isLoading && (
          <div className="inbox-view__loading">Cargando...</div>
        )}

        {!isLoading && error && (
          <div className="inbox-view__error" role="alert">
            {error}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="inbox-view__empty">
            <p className="inbox-view__empty-title">Sin elementos</p>
            <p className="inbox-view__empty-text">
              Tu inbox está vacío. Los elementos de email, Paperless u otras fuentes aparecerán aquí.
            </p>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <ul className="inbox-view__list">
            {items.map((item) => (
              <li key={item.id} className="inbox-item">
                <div className="inbox-item__main">
                  <span className="inbox-item__source">
                    {SOURCE_LABELS[item.sourceType] ?? item.sourceType}
                  </span>
                  <h3 className="inbox-item__title">{item.title}</h3>
                  {item.body && (
                    <p className="inbox-item__body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>
                  )}
                </div>
                <div className="inbox-item__meta">
                  {item.priority !== "NONE" && (
                    <span className={`inbox-item__priority inbox-item__priority--${item.priority.toLowerCase()}`}>
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  )}
                  <time className="inbox-item__date" dateTime={new Date(item.createdAt).toISOString()}>
                    {new Date(item.createdAt).toLocaleDateString("es-ES")}
                  </time>
                  {item.status !== "DISMISSED" && (
                    <button
                      className="inbox-item__dismiss"
                      onClick={() => void handleDismiss(item.id)}
                      title="Descartar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
