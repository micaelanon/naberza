"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { WishlistSummary } from "@/modules/wishlist";
import type { WishlistStatus } from "@/modules/wishlist/wishlist.types";

const PAGE_SIZE = 10;

function filterItems(items: WishlistSummary[], query: string, status: WishlistStatus | "ALL"): WishlistSummary[] {
  return items.filter((item) => {
    if (status !== "ALL" && item.status !== status) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inNotes = item.notes?.toLowerCase().includes(q) ?? false;
      const inTags = item.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!inTitle && !inNotes && !inTags) return false;
    }
    return true;
  });
}

const CreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode => {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [priceEst, setPriceEst] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [tags, setTags] = useState("");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.wishlist.toast.created")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError(t("app.wishlist.error.requiredTitle")); return; }
    void submit(async () => {
      const res = await fetch("/wishlist/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          priceEst: priceEst ? Number(priceEst) : undefined,
          priority,
          tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error(t("app.wishlist.error.create"));
      setTitle(""); setUrl(""); setNotes(""); setPriceEst(""); setPriority("MEDIUM"); setTags("");
      onCreated();
    });
  }, [title, url, notes, priceEst, priority, tags, setError, submit, t, onCreated]);

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" placeholder={t("app.wishlist.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <input className="idea-form__input idea-form__input--price" type="number" step="0.01" placeholder={t("app.wishlist.pricePlaceholder")} value={priceEst} onChange={(e) => setPriceEst(e.target.value)} />
      </div>
      <input className="idea-form__input" type="url" placeholder={t("app.wishlist.urlPlaceholder")} value={url} onChange={(e) => setUrl(e.target.value)} />
      <textarea className="idea-form__textarea" placeholder={t("app.wishlist.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" placeholder={t("app.wishlist.tagsPlaceholder")} value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className="idea-form__select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="HIGH">{t("app.wishlist.priority.high")}</option>
          <option value="MEDIUM">{t("app.wishlist.priority.medium")}</option>
          <option value="LOW">{t("app.wishlist.priority.low")}</option>
          <option value="NONE">{t("app.wishlist.priority.none")}</option>
        </select>
      </div>
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.wishlist.action.create")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const EditForm = ({ item, onSaved, onCancel }: { item: WishlistSummary; onSaved: () => void; onCancel: () => void }): ReactNode => {
  const t = useTranslations();
  const [title, setTitle] = useState(item.title);
  const [url, setUrl] = useState(item.url ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [priceEst, setPriceEst] = useState(item.priceEst ?? "");
  const [priority, setPriority] = useState(item.priority);
  const [status, setStatus] = useState(item.status as WishlistStatus);
  const [tags, setTags] = useState(item.tags.join(", "));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError(t("app.wishlist.error.requiredTitle")); return; }
    void submit(async () => {
      const res = await fetch(`/wishlist/api/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), url: url.trim() || undefined, notes: notes.trim() || undefined,
          priceEst: priceEst ? Number(priceEst) : undefined, priority, status,
          tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error(t("app.wishlist.error.save"));
      onSaved();
    });
  }, [title, url, notes, priceEst, priority, status, tags, item.id, setError, submit, t, onSaved]);

  return (
    <form className="idea-form idea-form--edit" onSubmit={handleSubmit}>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <input className="idea-form__input idea-form__input--price" type="number" step="0.01" value={priceEst} onChange={(e) => setPriceEst(e.target.value)} />
      </div>
      <input className="idea-form__input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("app.wishlist.urlPlaceholder")} />
      <textarea className="idea-form__textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className="idea-form__select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="HIGH">{t("app.wishlist.priority.high")}</option>
          <option value="MEDIUM">{t("app.wishlist.priority.medium")}</option>
          <option value="LOW">{t("app.wishlist.priority.low")}</option>
          <option value="NONE">{t("app.wishlist.priority.none")}</option>
        </select>
      </div>
      <div className="idea-form__row">
        <select className="idea-form__select" value={status} onChange={(e) => setStatus(e.target.value as WishlistStatus)}>
          <option value="PENDING">{t("app.wishlist.status.pending")}</option>
          <option value="BOUGHT">{t("app.wishlist.status.bought")}</option>
          <option value="DISCARDED">{t("app.wishlist.status.discarded")}</option>
        </select>
      </div>
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.wishlist.action.save")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const ListItem = ({ item, onEdited, onDeleted }: { item: WishlistSummary; onEdited: () => void; onDeleted: () => void }): ReactNode => {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [buying, setBuying] = useState(false);
  const { showToast } = useToast();

  const priorityLabels: Record<string, string> = {
    HIGH: t("app.wishlist.priority.high"),
    MEDIUM: t("app.wishlist.priority.medium"),
    LOW: t("app.wishlist.priority.low"),
    NONE: t("app.wishlist.priority.none"),
  };

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/wishlist/api/${item.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast(t("app.wishlist.toast.deleted"));
      onDeleted();
    } catch {
      showToast(t("app.wishlist.error.delete"), "error");
    } finally {
      setDeleting(false);
    }
  }, [item.id, onDeleted, showToast, t]);

  const handleBought = useCallback(async () => {
    setBuying(true);
    try {
      const res = await fetch(`/wishlist/api/${item.id}/bought`, { method: "POST" });
      if (res.ok) { showToast(t("app.wishlist.toast.bought")); onEdited(); }
    } catch {
      showToast(t("app.wishlist.error.save"), "error");
    } finally {
      setBuying(false);
    }
  }, [item.id, onEdited, showToast, t]);

  if (editing) {
    return <li className="idea-item idea-item--editing"><EditForm item={item} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} /></li>;
  }

  return (
    <li className="page-list-item idea-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={item.title} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="idea-item__main">
        <strong>{item.title}</strong>
        {item.priceEst && <span className="page-badge">{item.priceEst} {item.currency}</span>}
        <span className="page-badge">{priorityLabels[item.priority]}</span>
        {item.status !== "PENDING" && <span className="page-badge">{item.status === "BOUGHT" ? "✅" : "❌"}</span>}
        {item.tags.length > 0 && <span className="page-tags">{item.tags.join(", ")}</span>}
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="wishlist-item__link">🔗</a>}
      </div>
      <div className="idea-item__actions">
        {item.status === "PENDING" && <button className="idea-item__edit-btn" onClick={() => void handleBought()} disabled={buying} title={t("app.wishlist.action.markBought")}>✅</button>}
        <button className="idea-item__edit-btn" onClick={() => setEditing(true)} title={t("app.common.edit")}>✎</button>
        <button className="idea-item__btn-delete" onClick={() => setConfirmDelete(true)} title={t("app.common.delete")}><span className="material-symbols-outlined">delete</span></button>
      </div>
    </li>
  );
};

const WishlistView = (): ReactNode => {
  const t = useTranslations();
  const [items, setItems] = useState<WishlistSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<WishlistStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const statusOptions = [
    { value: "ALL", label: t("app.wishlist.filter.all") },
    { value: "PENDING", label: t("app.wishlist.status.pending") },
    { value: "BOUGHT", label: t("app.wishlist.status.bought") },
    { value: "DISCARDED", label: t("app.wishlist.status.discarded") },
  ];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/wishlist/api");
      const body = (await res.json()) as { data: WishlistSummary[]; meta: { total: number } };
      setItems(body.data);
      setTotal(body.meta.total);
      setError(null);
    } catch { setError(t("app.wishlist.error.load")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { let m = true; (async () => { try { const r = await fetch("/wishlist/api"); const b = (await r.json()) as { data: WishlistSummary[]; meta: { total: number } }; if (m) { setItems(b.data); setTotal(b.meta.total); } } catch { if (m) setError(t("app.wishlist.error.load")); } finally { if (m) setLoading(false); } })(); return () => { m = false; }; }, [t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  const filtered = filterItems(items, searchQuery, filterStatus);
  const hasFilters = searchQuery.trim() !== "" || filterStatus !== "ALL";
  const cp = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated = filtered.slice((cp - 1) * PAGE_SIZE, cp * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t("app.wishlist.title")} <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : t("app.wishlist.action.new")}</button>
      </div>
      {showForm && <CreateForm onCreated={() => { setShowForm(false); void fetchItems(); }} onCancel={() => setShowForm(false)} />}
      <div className="filter-bar">
        <input className="filter-bar__search" type="search" placeholder={t("app.wishlist.searchPlaceholder")} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        <select className="filter-bar__select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as WishlistStatus | "ALL"); setPage(1); }}>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); setPage(1); }}>{t("app.wishlist.filter.clear")}</button>}
        {hasFilters && <span className="filter-bar__count">{t("app.wishlist.filter.count", { filtered: filtered.length, total: items.length })}</span>}
      </div>
      {filtered.length === 0
        ? <p className="page-empty">{hasFilters ? t("app.wishlist.empty.filtered") : t("app.wishlist.empty.default")}</p>
        : <ul className="page-list">{paginated.map((item) => <ListItem key={item.id} item={item} onEdited={() => void fetchItems()} onDeleted={() => void fetchItems()} />)}</ul>}
      <Pagination currentPage={cp} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel={t("app.wishlist.paginationLabel")} onPageChange={setPage} />
    </div>
  );
};

export default WishlistView;
