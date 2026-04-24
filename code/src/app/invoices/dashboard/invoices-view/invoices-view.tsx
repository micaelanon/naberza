"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { ReactNode } from "react";
import type { InvoiceSummary } from "@/modules/invoices";
import type { InvoiceStatus } from "@/modules/invoices/invoice.types";

const PAGE_SIZE = 10;

function filterInvoices(invoices: InvoiceSummary[], query: string, status: InvoiceStatus | "ALL"): InvoiceSummary[] {
  return invoices.filter((inv) => {
    if (status !== "ALL" && inv.status !== status) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!inv.issuer.toLowerCase().includes(q) && !(inv.category?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });
}

// ─── Create form ──────────────────────────────────────────────────────────────

const InvoiceCreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode  => {
  const [issuer, setIssuer] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Factura creada"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !amount) { setError("Emisor y importe son obligatorios"); return; }
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
      if (!res.ok) throw new Error("Error al crear la factura");
      setIssuer(""); setAmount(""); setDueDate(""); setCategory(""); setNotes("");
      onCreated();
    });
  };

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input className="form-input" type="text" placeholder="Emisor (ej: Endesa)" value={issuer} onChange={(e) => setIssuer(e.target.value)} autoFocus />
        <input className="form-input form-input--short" type="number" step="0.01" placeholder="Importe (€)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="form-row">
        <label className="form-label">Fecha emisión <input className="form-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label className="form-label">Fecha vencimiento <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      </div>
      <input className="form-input" type="text" placeholder="Categoría (ej: Suministros)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <textarea className="form-textarea" placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear factura"}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

const InvoiceEditForm = ({ invoice, onSaved, onCancel }: {
  invoice: InvoiceSummary;
  onSaved: () => void;
  onCancel: () => void;
}): ReactNode  => {
  const [issuer, setIssuer] = useState(invoice.issuer);
  const [amount, setAmount] = useState(String(Number(invoice.amount)));
  const [issueDate, setIssueDate] = useState(new Date(invoice.issueDate).toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "");
  const [category, setCategory] = useState(invoice.category ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Cambios guardados"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !amount) { setError("Emisor y importe son obligatorios"); return; }
    void submit(async () => {
      const res = await fetch(`/invoices/api/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer: issuer.trim(),
          amount: parseFloat(amount),
          issueDate,
          dueDate: dueDate || undefined,
          category: category.trim() || undefined,
          status,
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
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input className="form-input" type="text" placeholder="Emisor" value={issuer} onChange={(e) => setIssuer(e.target.value)} autoFocus />
        <input className="form-input form-input--short" type="number" step="0.01" placeholder="Importe (€)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
          <option value="PENDING">Pendiente</option>
          <option value="PAID">Pagada</option>
          <option value="OVERDUE">Vencida</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>
      <div className="form-row">
        <label className="form-label">Fecha emisión <input className="form-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label className="form-label">Fecha vencimiento <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      </div>
      <input className="form-input" type="text" placeholder="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

const InvoiceListItem = ({ invoice, onEdited, onPaid, onDeleted }: {
  invoice: InvoiceSummary;
  onEdited: () => void;
  onPaid: (id: string) => void;
  onDeleted: () => void;
}): ReactNode  => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/invoices/api/${invoice.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast("Factura eliminada");
      onDeleted();
    } catch {
      showToast("Error al eliminar la factura", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <li className="page-list-item invoice-item--editing">
        <InvoiceEditForm
          invoice={invoice}
          onSaved={() => { setEditing(false); onEdited(); }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="page-list-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={invoice.issuer} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="invoice-item__main">
        <strong>{invoice.issuer}</strong>
        <span className="page-amount">{Number(invoice.amount).toFixed(2)} {invoice.currency}</span>
        <span className={`page-badge page-badge--${invoice.status.toLowerCase()}`}>{invoice.status}</span>
        {invoice.dueDate && <time>{new Date(invoice.dueDate).toLocaleDateString("es-ES")}</time>}
      </div>
      <div className="invoice-item__actions">
        <button className="invoice-item__btn invoice-item__btn--delete" onClick={() => setConfirmDelete(true)} title="Eliminar"><span className="material-symbols-outlined">delete</span></button>
        <button className="invoice-item__btn" onClick={() => setEditing(true)} title="Editar">✎</button>
        {invoice.status === "PENDING" && (
          <button className="invoice-item__btn invoice-item__btn--pay" onClick={() => onPaid(invoice.id)} title="Marcar como pagada">✓</button>
        )}
      </div>
    </li>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const InvoicesView = (): ReactNode  => {
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
    } catch {
      setError("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices() // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => { /* handled inside fetchInvoices */ })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchInvoices]);

  const handlePaid = async (id: string) => {
    const res = await fetch(`/invoices/api/${id}/pay`, { method: "POST" });
    if (res.ok) void fetchInvoices();
  };

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  const filteredInvoices = filterInvoices(invoices, searchQuery, filterStatus);
  const hasFilters = searchQuery.trim() !== "" || filterStatus !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE)));
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Facturas <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nueva factura"}</button>
      </div>
      {showForm && (
        <InvoiceCreateForm
          onCreated={() => { setShowForm(false); void fetchInvoices(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="search"
          placeholder="Buscar facturas..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as InvoiceStatus | "ALL"); setPage(1); }}
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="PAID">Pagadas</option>
          <option value="OVERDUE">Vencidas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterStatus("ALL"); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{filteredInvoices.length} de {invoices.length}</span>
        )}
      </div>
      {filteredInvoices.length === 0
        ? <p className="page-empty">{hasFilters ? "No hay facturas que coincidan con los filtros." : "No hay facturas. Haz clic en \"+ Nueva factura\" para añadir una."}</p>
        : (
          <ul className="page-list">
            {paginatedInvoices.map((invoice) => (
              <InvoiceListItem
                key={invoice.id}
                invoice={invoice}
                onEdited={() => void fetchInvoices()}
                onPaid={(id) => void handlePaid(id)}
                onDeleted={() => void fetchInvoices()}
              />
            ))}
          </ul>
        )
      }
      <Pagination currentPage={currentPage} totalItems={filteredInvoices.length} pageSize={PAGE_SIZE} itemLabel="facturas" onPageChange={setPage} />
    </div>
  );
}

export default InvoicesView;
