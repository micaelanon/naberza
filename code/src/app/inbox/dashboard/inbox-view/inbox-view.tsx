"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { InboxClassification, InboxItem } from "@/modules/inbox/inbox.types";
import type { Priority } from "@/modules/tasks/task.types";

import type {
  InboxApiResponse,
  InboxContentProps,
  InboxCreateFormProps,
  InboxEditFormProps,
  InboxListItemProps,
  StatusTab,
  StatusTabOption,
} from "./utils/types";
import "./inbox-view.css";

const PAGE_SIZE = 10;

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

const InboxCreateForm = ({ onCreated, onCancel }: InboxCreateFormProps): ReactNode  => {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NONE");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.inbox.toast.created")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("app.inbox.error.requiredTitle"));
      return;
    }
    void submit(async () => {
      const res = await fetch("/inbox/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, sourceType: "MANUAL", priority }),
      });
      if (!res.ok) throw new Error(t("app.inbox.error.create"));
      setTitle("");
      setBody("");
      setPriority("NONE");
      onCreated();
    });
  }, [body, onCreated, priority, setError, submit, t, title]);

  return (
    <form className="inbox-form" onSubmit={handleSubmit}>
      <input className="inbox-form__input" type="text" placeholder={t("app.inbox.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="inbox-form__textarea" placeholder={t("app.inbox.detailPlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="inbox-form__row">
        <select className="inbox-form__select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="NONE">{t("app.inbox.priority.none")}</option>
          <option value="LOW">{t("app.inbox.priority.low")}</option>
          <option value="MEDIUM">{t("app.inbox.priority.medium")}</option>
          <option value="HIGH">{t("app.inbox.priority.high")}</option>
        </select>
        <button className="inbox-form__btn inbox-form__btn--save" type="submit" disabled={saving}>
          {saving ? t("app.common.loading") : t("app.inbox.action.add")}
        </button>
        <button className="inbox-form__btn inbox-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
      {error && <p className="inbox-form__error">{error}</p>}
    </form>
  );
};

const InboxEditForm = ({ item, onSaved, onCancel }: InboxEditFormProps): ReactNode  => {
  const t = useTranslations();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [classification, setClassification] = useState<InboxClassification | "">(item.classification ?? "");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("app.inbox.error.requiredTitle"));
      return;
    }
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
        const bodyResponse = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(bodyResponse?.error ?? t("app.inbox.error.save"));
      }
      onSaved();
    });
  }, [body, classification, item.id, onSaved, priority, setError, submit, t, title]);

  const classificationOptions = useMemo(() => ([
    { value: "", label: t("app.inbox.category.unclassified") },
    { value: "TASK", label: t("app.inbox.category.task") },
    { value: "DOCUMENT", label: t("app.inbox.category.document") },
    { value: "INVOICE", label: t("app.inbox.category.invoice") },
    { value: "EVENT", label: t("app.inbox.category.event") },
    { value: "ALERT", label: t("app.inbox.category.alert") },
    { value: "IDEA", label: t("app.inbox.category.idea") },
    { value: "FINANCIAL", label: t("app.inbox.category.financial") },
    { value: "REVIEW", label: t("app.inbox.category.review") },
  ]), [t]);

  return (
    <form className="inbox-form inbox-form--edit" onSubmit={handleSubmit}>
      <input className="inbox-form__input" type="text" placeholder={t("app.inbox.editTitlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="inbox-form__textarea" placeholder={t("app.inbox.detailPlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="inbox-form__row">
        <select className="inbox-form__select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="NONE">{t("app.inbox.priority.none")}</option>
          <option value="LOW">{t("app.inbox.priority.low")}</option>
          <option value="MEDIUM">{t("app.inbox.priority.medium")}</option>
          <option value="HIGH">{t("app.inbox.priority.high")}</option>
        </select>
        <select className="inbox-form__select" value={classification} onChange={(e) => setClassification(e.target.value as InboxClassification | "")}> 
          {classificationOptions.map((option) => (
            <option key={option.value || "none"} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button className="inbox-form__btn inbox-form__btn--save" type="submit" disabled={saving}>
          {saving ? t("app.common.loading") : t("app.common.save")}
        </button>
        <button className="inbox-form__btn inbox-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
      {error && <p className="inbox-form__error">{error}</p>}
    </form>
  );
};

const InboxListItem = ({ item, onDismiss, onEdited, onDeleted }: InboxListItemProps): ReactNode  => {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const sourceLabels = useMemo<Record<string, string>>(() => ({
    EMAIL: t("app.inbox.source.email"),
    PAPERLESS: t("app.inbox.source.paperless"),
    HOME_ASSISTANT: t("app.inbox.source.home"),
    MANUAL: t("app.inbox.source.manual"),
    API: t("app.inbox.source.api"),
  }), [t]);

  const priorityLabels = useMemo<Record<string, string>>(() => ({
    HIGH: t("app.inbox.priority.high"),
    MEDIUM: t("app.inbox.priority.medium"),
    LOW: t("app.inbox.priority.low"),
    NONE: "",
  }), [t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/inbox/api/${item.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast(t("app.inbox.toast.deleted"));
      onDeleted();
    } catch {
      showToast(t("app.inbox.error.delete"), "error");
    } finally {
      setDeleting(false);
    }
  }, [item.id, onDeleted, showToast, t]);

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
        <span className="inbox-item__source">{sourceLabels[item.sourceType] ?? item.sourceType}</span>
        <h3 className="inbox-item__title">{item.title}</h3>
        {item.body && <p className="inbox-item__body">{item.body.slice(0, 120)}{item.body.length > 120 ? "…" : ""}</p>}
      </div>
      <div className="inbox-item__meta">
        {item.priority !== "NONE" && (
          <span className={`inbox-item__priority inbox-item__priority--${item.priority.toLowerCase()}`}>
            {priorityLabels[item.priority]}
          </span>
        )}
        <time className="inbox-item__date" dateTime={new Date(item.createdAt).toISOString()}>
          {new Date(item.createdAt).toLocaleDateString("es-ES")}
        </time>
        {item.status !== "DISMISSED" && (
          <>
            <button className="inbox-item__edit" onClick={() => setEditing(true)} title={t("app.common.edit")}>✎</button>
            <button className="inbox-item__btn inbox-item__btn--delete" onClick={() => setConfirmDelete(true)} title={t("app.common.delete")}><span className="material-symbols-outlined">delete</span></button>
            <button className="inbox-item__dismiss" onClick={() => onDismiss(item.id)} title={t("app.inbox.action.dismiss")}>✕</button>
          </>
        )}
      </div>
    </li>
  );
};

const InboxContent = ({ isLoading, error, items, onDismiss, onEdited, onDeleted, hasActiveFilters }: InboxContentProps): ReactNode  => {
  const t = useTranslations();

  if (isLoading) return <div className="inbox-view__loading">{t("app.common.loading")}</div>;
  if (error) return <div className="inbox-view__error" role="alert">{error}</div>;
  if (items.length === 0) {
    return (
      <div className="inbox-view__empty">
        <p className="inbox-view__empty-title">{hasActiveFilters ? t("app.common.noResults") : t("app.inbox.empty.title")}</p>
        <p className="inbox-view__empty-text">{hasActiveFilters ? t("app.inbox.empty.filtered") : t("app.inbox.empty.default")}</p>
      </div>
    );
  }
  return (
    <ul className="inbox-view__list">
      {items.map((item) => <InboxListItem key={item.id} item={item} onDismiss={onDismiss} onEdited={onEdited} onDeleted={onDeleted} />)}
    </ul>
  );
};

const InboxView = (): ReactNode  => {
  const t = useTranslations();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const statusTabs = useMemo<StatusTabOption[]>(() => ([
    { value: "ALL", label: t("app.inbox.tab.all") },
    { value: "PENDING", label: t("app.inbox.tab.pending") },
    { value: "CLASSIFIED", label: t("app.inbox.tab.classified") },
    { value: "DISMISSED", label: t("app.inbox.tab.dismissed") },
  ]), [t]);

  const fetchItems = useCallback(async (status: StatusTab) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(`/inbox/api?${params.toString()}`);
      if (!response.ok) throw new Error(t("app.inbox.error.load"));
      const json = (await response.json()) as InboxApiResponse;
      setItems(json.data);
      setTotal(json.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("app.common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeTab !== "ALL") params.set("status", activeTab);
        const response = await fetch(`/inbox/api?${params.toString()}`);
        if (!response.ok) throw new Error(t("app.inbox.error.load"));
        const json = (await response.json()) as InboxApiResponse;
        if (!isMounted) return;
        setItems(json.data);
        setTotal(json.meta.total);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : t("app.common.error"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [activeTab, t]);

  const handleDismiss = useCallback(async (id: string) => {
    const response = await fetch(`/inbox/api/${id}/dismiss`, { method: "POST" });
    if (response.ok) void fetchItems(activeTab);
  }, [activeTab, fetchItems]);

  const filteredItems = filterInboxItems(items, searchQuery, filterPriority);
  const hasFilters = searchQuery.trim() !== "" || filterPriority !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)));
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="inbox-view">
      <header className="inbox-view__header">
        <h1 className="inbox-view__title">{t("app.inbox.title")}</h1>
        <span className="inbox-view__count">{t("app.inbox.count", { count: total })}</span>
        <button className="inbox-view__add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕" : t("app.inbox.action.new")}
        </button>
      </header>

      {showForm && (
        <InboxCreateForm
          onCreated={() => { setShowForm(false); void fetchItems(activeTab); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <nav className="inbox-view__tabs" role="tablist">
        {statusTabs.map((tab) => (
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
          placeholder={t("app.inbox.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value as Priority | "ALL"); setPage(1); }}
        >
          <option value="ALL">{t("app.inbox.filter.allPriorities")}</option>
          <option value="HIGH">{t("app.inbox.priority.high")}</option>
          <option value="MEDIUM">{t("app.inbox.priority.medium")}</option>
          <option value="LOW">{t("app.inbox.priority.low")}</option>
          <option value="NONE">{t("app.inbox.priority.none")}</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterPriority("ALL"); setPage(1); }}>
            {t("app.inbox.filter.clear")}
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{t("app.inbox.filter.count", { filtered: filteredItems.length, total: items.length })}</span>
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
      <Pagination currentPage={currentPage} totalItems={filteredItems.length} pageSize={PAGE_SIZE} itemLabel={t("app.inbox.paginationLabel")} onPageChange={setPage} />
    </div>
  );
};

export default InboxView;
