"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { InvoiceSummary } from "@/modules/invoices";
import type { InvoiceStatus } from "@/modules/invoices/invoice.types";

const PAGE_SIZE = 10;

function filterInvoices(invoices: InvoiceSummary[], query: string, status: InvoiceStatus | "ALL"): InvoiceSummary[] {
  return invoices.filter((invoice) => {
    if (status !== "ALL" && invoice.status !== status) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!invoice.issuer.toLowerCase().includes(q) && !(invoice.category?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });
}

const InvoiceCreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode  => {
  const t = useTranslations();
  const [issuer, setIssuer] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.invoices.toast.created")),
    onError: (message) => showToast(message, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !amount) {
      setError(t("app.invoices.error.requiredIssuerAmount"));
      return;
    }
    void submit(async () => {
      const res = await fetch("/invoices/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer: issuer.trim(),
          amount: parseFloat(amount),
          issueDate,
          dueDate: dueDate || undefined,
          category: category.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(t("app.invoices.error.create"));
      setIssuer("");
      setAmount("");
      setDueDate("");
      setCategory("");
      setNotes("");
      onCreated();
    });
  }, [amount, category, dueDate, issueDate, issuer, notes, onCreated, setError, submit, t]);

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input className="form-input" type="text" placeholder={t("app.invoices.issuerPlaceholder")} value={issuer} onChange={(e) => setIssuer(e.target.value)} autoFocus />
        <input className="form-input form-input--short" type="number" step="0.01" placeholder={t("app.invoices.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="form-row">
        <label className="form-label">{t("app.invoices.issueDateLabel")} <input className="form-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label className="form-label">{t("app.invoices.dueDateLabel")} <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      </div>
      <input className="form-input" type="text" placeholder={t("app.invoices.categoryPlaceholder")} value={category} onChange={(e) => setCategory(e.target.value)} />
      <textarea className="form-textarea" placeholder={t("app.invoices.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.invoices.action.create")}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const InvoiceEditForm = ({ invoice, onSaved, onCancel }: { invoice: InvoiceSummary; onSaved: () => void; onCancel: () => void }): ReactNode  => {
  const t = useTranslations();
  const [issuer, setIssuer] = useState(invoice.issuer);
  const [amount, setAmount] = useState(String(Number(invoice.amount)));
  const [issueDate, setIssueDate] = useState(new Date(invoice.issueDate).toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "");
  const [category, setCategory] = useState(invoice.category ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (message) => showToast(message, "error"),
  });

  const statusOptions = useMemo(() => ([
    { value: "PENDING", label: t("app.invoices.status.pending") },
    { value: "PAID", label: t("app.invoices.status.paid") },
    { value: "OVERDUE", label: t("app.invoices.status.overdue") },
    { value: "CANCELLED", label: t("app.invoices.status.cancelled") },
  ]), [t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !amount) {
      setError(t("app.invoices.error.requiredIssuerAmount"));
      return;
    }
    void submit(async () => {
      const res = await fetch(`/invoices/api/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuer: issuer.trim(), amount: parseFloat(amount), issueDate, dueDate: dueDate || undefined, category: category.trim() || undefined, status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("app.invoices.error.save"));
      }
      onSaved();
    });
  }, [amount, category, dueDate, invoice.id, issueDate, issuer, onSaved, setError, status, submit, t]);

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input className="form-input" type="text" placeholder={t("app.invoices.editIssuerPlaceholder")} value={issuer} onChange={(e) => setIssuer(e.target.value)} autoFocus />
        <input className="form-input form-input--short" type="number" step="0.01" placeholder={t("app.invoices.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="form-row">
        <label className="form-label">{t("app.invoices.issueDateLabel")} <input className="form-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label className="form-label">{t("app.invoices.dueDateLabel")} <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      </div>
      <input className="form-input" type="text" placeholder={t("app.invoices.editCategoryPlaceholder")} value={category} onChange={(e) => setCategory(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.invoices.action.save")}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const InvoicesListItem = ({ invoice, onEdited, onPaid, onDeleted }: { invoice: InvoiceSummary; onEdited: () => void; onPaid: (id: string) => void; onDeleted: () => void }): ReactNode  => {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const statusLabels = useMemo<Record<string, string>>(() => ({
    PENDING: t("app.invoices.status.pending"),
    PAID: t("app.invoices.status.paid"),
    OVERDUE: t("app.invoices.status.overdue"),
    CANCELLED: t("app.invoices.status.cancelled"),
  }), [t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/invoices/api/${invoice.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast(t("app.invoices.toast.deleted"));
      onDeleted();
    } catch {
      showToast(t("app.invoices.error.delete"), "error");
    } finally {
      setDeleting(false);
    }
  }, [invoice.id, onDeleted, showToast, t]);

  if (editing) {
    return (
      <li className="page-list-item invoice-item--editing">
        <InvoiceEditForm invoice={invoice} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="page-list-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={invoice.issuer} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="invoice-item__main">
        <strong>{invoice.issuer}</strong>
        <span className="page-amount">{Number(invoice.amount).toFixed(2)} {invoice.currency}</span>
        <span className={`page-badge page-badge--${invoice.status.toLowerCase()}`}>{statusLabels[invoice.status] ?? invoice.status}</span>
        {invoice.dueDate && <time>{new Date(invoice.dueDate).toLocaleDateString("es-ES")}</time>}
      </div>
      <div className="invoice-item__actions">
        <button className="invoice-item__btn invoice-item__btn--delete" onClick={() => setConfirmDelete(true)} title={t("app.common.delete")}><span className="material-symbols-outlined">delete</span></button>
        <button className="invoice-item__btn" onClick={() => setEditing(true)} title={t("app.common.edit")}>✎</button>
        {invoice.status === "PENDING" && (
          <button className="invoice-item__btn invoice-item__btn--pay" onClick={() => onPaid(invoice.id)} title={t("app.invoices.action.markPaid")}>✓</button>
        )}
      </div>
    </li>
  );
};

const InvoicesView = (): ReactNode  => {
  const t = useTranslations();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/invoices/api");
      const body = (await res.json()) as { data: InvoiceSummary[]; total: number };
      setInvoices(body.data);
      setTotal(body.total);
      setError(null);
    } catch {
      setError(t("app.invoices.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    const loadInvoices = async () => {
      setLoading(true);
      try {
        const res = await fetch("/invoices/api");
        const body = (await res.json()) as { data: InvoiceSummary[]; total: number };
        if (!isMounted) return;
        setInvoices(body.data);
        setTotal(body.total);
        setError(null);
      } catch {
        if (!isMounted) return;
        setError(t("app.invoices.error.load"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handlePaid = useCallback(async (id: string) => {
    const res = await fetch(`/invoices/api/${id}/pay`, { method: "POST" });
    if (res.ok) void fetchInvoices();
  }, [fetchInvoices]);

  const statusOptions = useMemo(() => ([
    { value: "ALL", label: t("app.invoices.filter.allStatuses") },
    { value: "PENDING", label: t("app.invoices.status.pending") },
    { value: "PAID", label: t("app.invoices.status.paid") },
    { value: "OVERDUE", label: t("app.invoices.status.overdue") },
    { value: "CANCELLED", label: t("app.invoices.status.cancelled") },
  ]), [t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  const filteredInvoices = filterInvoices(invoices, searchQuery, filterStatus);
  const hasFilters = searchQuery.trim() !== "" || filterStatus !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE)));
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t("app.invoices.title")} <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : t("app.invoices.action.new")}</button>
      </div>
      {showForm && <InvoiceCreateForm onCreated={() => { setShowForm(false); void fetchInvoices(); }} onCancel={() => setShowForm(false)} />}
      <div className="filter-bar">
        <input className="filter-bar__search" type="search" placeholder={t("app.invoices.searchPlaceholder")} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        <select className="filter-bar__select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as InvoiceStatus | "ALL"); setPage(1); }}>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {hasFilters && <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); setPage(1); }}>{t("app.invoices.filter.clear")}</button>}
        {hasFilters && <span className="filter-bar__count">{t("app.invoices.filter.count", { filtered: filteredInvoices.length, total: invoices.length })}</span>}
      </div>
      {filteredInvoices.length === 0
        ? <p className="page-empty">{hasFilters ? t("app.invoices.empty.filtered") : t("app.invoices.empty.default")}</p>
        : (
          <ul className="page-list">
            {paginatedInvoices.map((invoice) => (
              <InvoicesListItem key={invoice.id} invoice={invoice} onEdited={() => void fetchInvoices()} onPaid={(id) => void handlePaid(id)} onDeleted={() => void fetchInvoices()} />
            ))}
          </ul>
        )}
      <Pagination currentPage={currentPage} totalItems={filteredInvoices.length} pageSize={PAGE_SIZE} itemLabel={t("app.invoices.paginationLabel")} onPageChange={setPage} />
    </div>
  );
};

export default InvoicesView;
