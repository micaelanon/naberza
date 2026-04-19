"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InboxItem, InboxStatus, InboxClassification } from "@/modules/inbox/inbox.types";
import type { Priority } from "@/modules/tasks/task.types";
import { useFormSubmit } from "@/hooks";
import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import "./inbox-view.css";

type StatusTab = "ALL" | InboxStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CLASSIFIED", label: "Clasificados" },
  { value: "DISMISSED", label: "Descartados" },
];

const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja", NONE: "" };
const SOURCE_LABELS: Record<string, string> = {
  EMAIL: "Email", PAPERLESS: "Paperless", HOME_ASSISTANT: "Home", MANUAL: "Manual", API: "API",
};

function filterInboxItems(items: InboxItem[], query: string, priority: Priority | "ALL"): InboxItem[] {
  return items.filter((item) => {
    if (priority !== "ALL" && item.priority !== priority) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !(item.body?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });
}

const PAGE_SIZE = 10;

interface InboxApiResponse {
  data: InboxItem[];
  meta: { total: number; page: number; pageSize: number };
}

// ─── Create form ──────────────────────────────────────────────────────────────

function InboxCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NONE");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Añadido al inbox"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch("/inbox/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, sourceType: "MANUAL", priority }),
      });
      if (!res.ok) throw new Error("Error al crear el item");
      setTitle(""); setBody(""); setPriority("NONE");
      onCreated();
    });
  };

  return (
    <form className="inbox-form" onSubmit={handleSubmit}>
      <input className="inbox-form__input" type="text" placeholder="¿Qué quieres anotar?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="inbox-form__textarea" placeholder="Detalles (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="inbox-form__row">
        <select className="inbox-form__select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="NONE">Sin prioridad</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <button className="inbox-form__btn inbox-form__btn--save" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Añadir al inbox"}
        </button>
        <button className="inbox-form__btn inbox-form__btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
      {error && <p className="inbox-form__error">{error}</p>}
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function InboxEditForm({ item, onSaved, onCancel }: { item: InboxItem; onSaved: () => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [classification, setClassification] = useState<InboxClassification | "">(item.classification ?? "");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Cambios guardados"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch(`/inbox/api/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          priority,
          classification: classification || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(b?.error ?? "Error al guardar");
      }
      onSaved();
    });
  };

  return (
    <form className="inbox-form inbox-form--edit" onSubmit={handleSubmit}>
      <input className="inbox-form__input" type="text" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="inbox-form__textarea" placeholder="Detalles (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="inbox-form__row">
        <select className="inbox-form__select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="NONE">Sin prioridad</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <select className="inbox-form__select" value={classification} onChange={(e) => setClassification(e.target.value as InboxClassification | "")}>
          <option value="">Sin clasificar</option>
          <option value="TASK">Tarea</option>
          <option value="DOCUMENT">Documento</option>
          <option value="INVOICE">Factura</option>
          <option value="EVENT">Evento</option>
          <option value="ALERT">Alerta</option>
          <option value="IDEA">Idea</option>
          <option value="FINANCIAL">Financiero</option>
          <option value="REVIEW">Revisión</option>
        </select>
        <button className="inbox-form__btn inbox-form__btn--save" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button className="inbox-form__btn inbox-form__btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
      {error && <p className="inbox-form__error">{error}</p>}
    </form>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function InboxListItem({ item, onDismiss, onEdited, onDeleted }: {
  item: InboxItem;
  onDismiss: (id: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/inbox/api/${item.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast("Item eliminado");
      onDeleted();
    } catch {
      showToast("Error al eliminar el item", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <li className="inbox-item inbox-item--editing">
        <InboxEditForm item={item} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="inbox-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={item.title} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="inbox-item__main">
        <span className="inbox-item__source">{SOURCE_LABELS[item.sourceType] ?? item.sourceType}</span>
        <h3 className="inbox-item__title">{item.title}</h3>
        {item.body && <p className="inbox-item__body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>}
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
          <>
            <button className="inbox-item__edit" onClick={() => setEditing(true)} title="Editar">✎</button>
            <button className="inbox-item__btn inbox-item__btn--delete" onClick={() => setConfirmDelete(true)} title="Eliminar"><span className="material-symbols-outlined">delete</span></button>
            <button className="inbox-item__dismiss" onClick={() => onDismiss(item.id)} title="Descartar">✕</button>
          </>
        )}
      </div>
    </li>
  );
}

// ─── Content area ─────────────────────────────────────────────────────────────

function InboxContent({ isLoading, error, items, onDismiss, onEdited, onDeleted, hasActiveFilters }: {
  isLoading: boolean; error: string | null; items: InboxItem[];
  onDismiss: (id: string) => void; onEdited: () => void; onDeleted: () => void; hasActiveFilters: boolean;
}): ReactNode {
  if (isLoading) return <div className="inbox-view__loading">Cargando...</div>;
  if (error) return <div className="inbox-view__error" role="alert">{error}</div>;
  if (items.length === 0) {
    return (
      <div className="inbox-view__empty">
        <p className="inbox-view__empty-title">{hasActiveFilters ? "Sin resultados" : "Sin elementos"}</p>
        <p className="inbox-view__empty-text">{hasActiveFilters ? "No hay items que coincidan con los filtros." : "Haz clic en \"+ Nuevo item\" para añadir algo al inbox."}</p>
      </div>
    );
  }
  return (
    <ul className="inbox-view__list">
      {items.map((item) => <InboxListItem key={item.id} item={item} onDismiss={onDismiss} onEdited={onEdited} onDeleted={onDeleted} />)}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "ALL">("ALL");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    let cancelled = false;
    fetchItems(activeTab) // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => { /* handled inside fetchItems */ })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [activeTab, fetchItems]);

  const handleDismiss = async (id: string) => {
    const response = await fetch(`/inbox/api/${id}/dismiss`, { method: "POST" });
    if (response.ok) void fetchItems(activeTab);
  };

  const filteredItems = filterInboxItems(items, searchQuery, filterPriority);
  const hasFilters = searchQuery.trim() !== "" || filterPriority !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)));
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="inbox-view">
      <header className="inbox-view__header">
        <h1 className="inbox-view__title">Inbox</h1>
        <span className="inbox-view__count">{total} elementos</span>
        <button className="inbox-view__add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕" : "+ Nuevo item"}
        </button>
      </header>

      {showForm && (
        <InboxCreateForm
          onCreated={() => { setShowForm(false); void fetchItems(activeTab); }}
          onCancel={() => setShowForm(false)}
        />
      )}

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

      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="search"
          placeholder="Buscar en inbox..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value as Priority | "ALL"); setPage(1); }}
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Media</option>
          <option value="LOW">Baja</option>
          <option value="NONE">Sin prioridad</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterPriority("ALL"); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{filteredItems.length} de {items.length}</span>
        )}
      </div>

      <div className="inbox-view__content">
        <InboxContent
          isLoading={isLoading}
          error={error}
          items={paginatedItems}
          onDismiss={(id) => void handleDismiss(id)}
          onEdited={() => void fetchItems(activeTab)}
          onDeleted={() => void fetchItems(activeTab)}
          hasActiveFilters={hasFilters}
        />
      </div>
      <Pagination currentPage={currentPage} totalItems={filteredItems.length} pageSize={PAGE_SIZE} itemLabel="items" onPageChange={setPage} />
    </div>
  );
}
