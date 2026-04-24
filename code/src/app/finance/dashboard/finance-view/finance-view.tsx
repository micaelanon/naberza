"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { FinanceEntrySummary } from "@/modules/finance";
import type { FinancialEntryType } from "@/modules/finance/finance.types";

const PAGE_SIZE = 10;

function filterFinanceEntries(entries: FinanceEntrySummary[], query: string, type: FinancialEntryType | "ALL"): FinanceEntrySummary[] {
  return entries.filter((entry) => {
    if (type !== "ALL" && entry.type !== type) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(entry.description?.toLowerCase().includes(q) ?? false) && !(entry.category?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });
}

const FinanceCreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode  => {
  const t = useTranslations();
  const [type, setType] = useState<FinancialEntryType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.finance.toast.created")),
    onError: (message) => showToast(message, "error"),
  });

  const typeOptions = useMemo(() => ([
    { value: "EXPENSE", label: t("app.finance.type.expense") },
    { value: "INCOME", label: t("app.finance.type.income") },
    { value: "RECURRING_CHARGE", label: t("app.finance.type.recurring") },
    { value: "BALANCE_SNAPSHOT", label: t("app.finance.type.snapshot") },
  ]), [t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setError(t("app.finance.error.requiredAmount"));
      return;
    }
    void submit(async () => {
      const res = await fetch("/finance/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: parseFloat(amount), description: description.trim() || undefined, category: category.trim() || undefined, date }),
      });
      if (!res.ok) throw new Error(t("app.finance.error.create"));
      setAmount("");
      setDescription("");
      setCategory("");
      onCreated();
    });
  }, [amount, category, date, description, onCreated, setError, submit, t, type]);

  return (
    <form className="finance-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-row">
        <select className="form-select" value={type} onChange={(e) => setType(e.target.value as FinancialEntryType)}>
          {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input className="form-input form-input--short" type="number" step="0.01" placeholder={t("app.finance.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <input className="form-input" type="text" placeholder={t("app.finance.descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="form-input" type="text" placeholder={t("app.finance.categoryPlaceholder")} value={category} onChange={(e) => setCategory(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.finance.action.create")}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const FinanceEditForm = ({ entry, onSaved, onCancel }: { entry: FinanceEntrySummary; onSaved: () => void; onCancel: () => void }): ReactNode  => {
  const t = useTranslations();
  const [type, setType] = useState<FinancialEntryType>(entry.type);
  const [amount, setAmount] = useState(String(Number(entry.amount)));
  const [description, setDescription] = useState(entry.description ?? "");
  const [category, setCategory] = useState(entry.category ?? "");
  const [date, setDate] = useState(new Date(entry.date).toISOString().slice(0, 10));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (message) => showToast(message, "error"),
  });

  const typeOptions = useMemo(() => ([
    { value: "EXPENSE", label: t("app.finance.type.expense") },
    { value: "INCOME", label: t("app.finance.type.income") },
    { value: "RECURRING_CHARGE", label: t("app.finance.type.recurring") },
    { value: "BALANCE_SNAPSHOT", label: t("app.finance.type.snapshot") },
  ]), [t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setError(t("app.finance.error.requiredAmount"));
      return;
    }
    void submit(async () => {
      const res = await fetch(`/finance/api/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: parseFloat(amount), description: description.trim() || undefined, category: category.trim() || undefined, date }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("app.finance.error.save"));
      }
      onSaved();
    });
  }, [amount, category, date, description, entry.id, onSaved, setError, submit, t, type]);

  return (
    <form className="finance-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-row">
        <select className="form-select" value={type} onChange={(e) => setType(e.target.value as FinancialEntryType)}>
          {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input className="form-input form-input--short" type="number" step="0.01" placeholder={t("app.finance.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <input className="form-input" type="text" placeholder={t("app.finance.descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="form-input" type="text" placeholder={t("app.finance.editCategoryPlaceholder")} value={category} onChange={(e) => setCategory(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.finance.action.save")}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const FinanceEntryItem = ({ entry, onEdited, onDeleted }: { entry: FinanceEntrySummary; onEdited: () => void; onDeleted: () => void }): ReactNode  => {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const typeLabels = useMemo<Record<string, string>>(() => ({
    EXPENSE: t("app.finance.type.expense"),
    INCOME: t("app.finance.type.income"),
    BALANCE_SNAPSHOT: t("app.finance.type.snapshotShort"),
    RECURRING_CHARGE: t("app.finance.type.recurringShort"),
  }), [t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/finance/api/${entry.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast(t("app.finance.toast.deleted"));
      onDeleted();
    } catch {
      showToast(t("app.finance.error.delete"), "error");
    } finally {
      setDeleting(false);
    }
  }, [entry.id, onDeleted, showToast, t]);

  if (editing) {
    return (
      <li className="page-list-item finance-item--editing">
        <FinanceEditForm entry={entry} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="page-list-item finance-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={entry.description ?? entry.category ?? entry.type} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="finance-item__main">
        <span className={`page-badge page-badge--${entry.type.toLowerCase()}`}>{typeLabels[entry.type] ?? entry.type}</span>
        <span className="page-amount">{Number(entry.amount).toFixed(2)} {entry.currency}</span>
        {entry.description && <span>{entry.description}</span>}
        {entry.category && <span className="page-tags">{entry.category}</span>}
        <time>{new Date(entry.date).toLocaleDateString("es-ES")}</time>
      </div>
      <button className="finance-item__btn-delete" onClick={() => setConfirmDelete(true)} title={t("app.common.delete")}><span className="material-symbols-outlined">delete</span></button>
      <button className="finance-item__edit-btn" onClick={() => setEditing(true)} title={t("app.common.edit")}>✎</button>
    </li>
  );
};

const FinanceView = (): ReactNode  => {
  const t = useTranslations();
  const [entries, setEntries] = useState<FinanceEntrySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FinancialEntryType | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(() => ([
    { value: "ALL", label: t("app.finance.filter.allTypes") },
    { value: "EXPENSE", label: t("app.finance.filter.expenses") },
    { value: "INCOME", label: t("app.finance.filter.income") },
    { value: "RECURRING_CHARGE", label: t("app.finance.filter.recurring") },
    { value: "BALANCE_SNAPSHOT", label: t("app.finance.filter.snapshots") },
  ]), [t]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/finance/api");
      const body = (await res.json()) as { data: FinanceEntrySummary[]; total: number };
      setEntries(body.data);
      setTotal(body.total);
      setError(null);
    } catch {
      setError(t("app.finance.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      setLoading(true);
      try {
        const res = await fetch("/finance/api");
        const body = (await res.json()) as { data: FinanceEntrySummary[]; total: number };
        if (!isMounted) return;
        setEntries(body.data);
        setTotal(body.total);
        setError(null);
      } catch {
        if (!isMounted) return;
        setError(t("app.finance.error.load"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadEntries();

    return () => {
      isMounted = false;
    };
  }, [t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  const filteredEntries = filterFinanceEntries(entries, searchQuery, filterType);
  const hasFilters = searchQuery.trim() !== "" || filterType !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE)));
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t("app.finance.title")} <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : t("app.finance.action.new")}</button>
      </div>
      {showForm && <FinanceCreateForm onCreated={() => { setShowForm(false); void fetchEntries(); }} onCancel={() => setShowForm(false)} />}
      <div className="filter-bar">
        <input className="filter-bar__search" type="search" placeholder={t("app.finance.searchPlaceholder")} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        <select className="filter-bar__select" value={filterType} onChange={(e) => { setFilterType(e.target.value as FinancialEntryType | "ALL"); setPage(1); }}>
          {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {hasFilters && <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterType("ALL"); setPage(1); }}>{t("app.finance.filter.clear")}</button>}
        {hasFilters && <span className="filter-bar__count">{t("app.finance.filter.count", { filtered: filteredEntries.length, total: entries.length })}</span>}
      </div>
      {filteredEntries.length === 0
        ? <p className="page-empty">{hasFilters ? t("app.finance.empty.filtered") : t("app.finance.empty.default")}</p>
        : (
          <ul className="page-list">
            {paginatedEntries.map((entry) => <FinanceEntryItem key={entry.id} entry={entry} onEdited={() => void fetchEntries()} onDeleted={() => void fetchEntries()} />)}
          </ul>
        )}
      <Pagination currentPage={currentPage} totalItems={filteredEntries.length} pageSize={PAGE_SIZE} itemLabel={t("app.finance.paginationLabel")} onPageChange={setPage} />
    </div>
  );
};

export default FinanceView;
