"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InboxItem, InboxStatus } from "@/modules/inbox/inbox.types";
import type { Priority } from "@/modules/tasks/task.types";
import "./inbox-view.css";

type StatusTab = "ALL" | InboxStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CLASSIFIED", label: "Clasificados" },
  { value: "DISMISSED", label: "Descartados" },
];

const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja", NONE: "" };
const SOURCE_LABELS: Record<string, string> = { EMAIL: "Email", PAPERLESS: "Paperless", HOME_ASSISTANT: "Home", MANUAL: "Manual", API: "API" };

interface InboxApiResponse {
  data: InboxItem[];
  meta: { total: number; page: number; pageSize: number };
}

// ─── Create form ──────────────────────────────────────────────────────────────

function InboxCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NONE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/inbox/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, sourceType: "MANUAL", priority }),
      });
      if (!res.ok) throw new Error("Error al crear el item");
      setTitle(""); setBody(""); setPriority("NONE");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="inbox-form" onSubmit={(e) => void handleSubmit(e)}>
      <input className="inbox-form__input" type="text" placeholder="¿Qué quieres anotar?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="inbox-form__textarea" placeholder="Detalles (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="inbox-form__row">
        <select className="inbox-form__select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="NONE">Sin prioridad</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <button className="inbox-form__btn inbox-form__btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Añadir al inbox"}</button>
        <button className="inbox-form__btn inbox-form__btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
      {error && <p className="inbox-form__error">{error}</p>}
    </form>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function InboxListItem({ item, onDismiss }: { item: InboxItem; onDismiss: (id: string) => void }): ReactNode {
  return (
    <li className="inbox-item">
      <div className="inbox-item__main">
        <span className="inbox-item__source">{SOURCE_LABELS[item.sourceType] ?? item.sourceType}</span>
        <h3 className="inbox-item__title">{item.title}</h3>
        {item.body && <p className="inbox-item__body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>}
      </div>
      <div className="inbox-item__meta">
        {item.priority !== "NONE" && <span className={`inbox-item__priority inbox-item__priority--${item.priority.toLowerCase()}`}>{PRIORITY_LABELS[item.priority]}</span>}
        <time className="inbox-item__date" dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleDateString("es-ES")}</time>
        {item.status !== "DISMISSED" && <button className="inbox-item__dismiss" onClick={() => onDismiss(item.id)} title="Descartar">✕</button>}
      </div>
    </li>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────

function InboxContent({ isLoading, error, items, onDismiss }: {
  isLoading: boolean; error: string | null; items: InboxItem[]; onDismiss: (id: string) => void;
}): ReactNode {
  if (isLoading) return <div className="inbox-view__loading">Cargando...</div>;
  if (error) return <div className="inbox-view__error" role="alert">{error}</div>;
  if (items.length === 0) {
    return (
      <div className="inbox-view__empty">
        <p className="inbox-view__empty-title">Sin elementos</p>
        <p className="inbox-view__empty-text">Haz clic en &quot;+ Nuevo item&quot; para añadir algo al inbox.</p>
      </div>
    );
  }
  return (
    <ul className="inbox-view__list">
      {items.map((item) => <InboxListItem key={item.id} item={item} onDismiss={onDismiss} />)}
    </ul>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function InboxView(): ReactNode {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchItems = useCallback(async (status: StatusTab) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(`/inbox/api?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar el inbox");
      const json = (await response.json()) as InboxApiResponse;
      setItems(json.data);
      setTotal(json.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchItems(activeTab); }, [activeTab, fetchItems]);

  const handleDismiss = async (id: string) => {
    const response = await fetch(`/inbox/api/${id}/dismiss`, { method: "POST" });
    if (response.ok) void fetchItems(activeTab);
  };

  return (
    <div className="inbox-view">
      <header className="inbox-view__header">
        <h1 className="inbox-view__title">Inbox</h1>
        <span className="inbox-view__count">{total} elementos</span>
        <button className="inbox-view__add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nuevo item"}</button>
      </header>

      {showForm && <InboxCreateForm onCreated={() => { setShowForm(false); void fetchItems(activeTab); }} onCancel={() => setShowForm(false)} />}

      <nav className="inbox-view__tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} role="tab" aria-selected={activeTab === tab.value} className={`inbox-view__tab ${activeTab === tab.value ? "inbox-view__tab--active" : ""}`} onClick={() => setActiveTab(tab.value)}>{tab.label}</button>
        ))}
      </nav>

      <div className="inbox-view__content">
        <InboxContent isLoading={isLoading} error={error} items={items} onDismiss={(id) => void handleDismiss(id)} />
      </div>
    </div>
  );
}
