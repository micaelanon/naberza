"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, Pagination, useToast } from "@/components/ui";
import type { ReactNode } from "react";
import { useFormSubmit } from "@/hooks";
import type { FinanceEntrySummary } from "@/modules/finance";
import type { FinancialEntryType } from "@/modules/finance/finance.types";

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  BALANCE_SNAPSHOT: "Saldo",
  RECURRING_CHARGE: "Recurrente",
};

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

// ─── Create form ──────────────────────────────────────────────────────────────

const FinanceCreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode  => {
  const [type, setType] = useState<FinancialEntryType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Movimiento registrado"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) { setError("El importe es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch("/finance/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          date,
        }),
      });
      if (!res.ok) throw new Error("Error al crear el movimiento");
      setAmount("");
      setDescription("");
      setCategory("");
      onCreated();
    });
  }, [amount, category, date, description, onCreated, setError, submit, type]);

  return (
    <form className="finance-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-row">
        <select className="form-select" value={type} onChange={(e) => setType(e.target.value as FinancialEntryType)}>
          <option value="EXPENSE">Gasto</option>
          <option value="INCOME">Ingreso</option>
          <option value="RECURRING_CHARGE">Cargo recurrente</option>
          <option value="BALANCE_SNAPSHOT">Snapshot de saldo</option>
        </select>
        <input className="form-input form-input--short" type="number" step="0.01" placeholder="Importe (€)" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <input className="form-input" type="text" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="form-input" type="text" placeholder="Categoría (ej: Transporte, Comida)" value={category} onChange={(e) => setCategory(e.target.value)} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="form-btn form-btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Registrar"}</button>
        <button className="form-btn form-btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

const FinanceEditForm = ({ entry, onSaved, onCancel }: {
  entry: FinanceEntrySummary;
  onSaved: () => void;
  onCancel: () => void;
}): ReactNode  => {
  const [type, setType] = useState<FinancialEntryType>(entry.type);
  const [amount, setAmount] = useState(String(Number(entry.amount)));
  const [description, setDescription] = useState(entry.description ?? "");
  const [category, setCategory] = useState(entry.category ?? "");
  const [date, setDate] = useState(new Date(entry.date).toISOString().slice(0, 10));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast("Cambios guardados"),
    onError: (m) => showToast(m, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) { setError("El importe es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch(`/finance/api/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          date,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(b?.error ?? "Error al guardar");
      }
      onSaved();
    });
  }, [amount, category, date, description, entry.id, onSaved, setError, submit, type]);

  return (
    <form className="finance-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="form-row">
        <select className="form-select" value={type} onChange={(e) => setType(e.target.value as FinancialEntryType)}>
          <option value="EXPENSE">Gasto</option>
          <option value="INCOME">Ingreso</option>
          <option value="RECURRING_CHARGE">Cargo recurrente</option>
          <option value="BALANCE_SNAPSHOT">Snapshot de saldo</option>
        </select>
        <input className="form-input form-input--short" type="number" step="0.01" placeholder="Importe (€)" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <input className="form-input" type="text" placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
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

const FinanceEntryItem = ({ entry, onEdited, onDeleted }: { entry: FinanceEntrySummary; onEdited: () => void; onDeleted: () => void }): ReactNode  => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/finance/api/${entry.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      showToast("Movimiento eliminado");
      onDeleted();
    } catch {
      showToast("Error al eliminar el movimiento", "error");
    } finally {
      setDeleting(false);
    }
  }, [entry.id, onDeleted, showToast]);

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
        <span className={`page-badge page-badge--${entry.type.toLowerCase()}`}>{TYPE_LABELS[entry.type] ?? entry.type}</span>
        <span className="page-amount">{Number(entry.amount).toFixed(2)} {entry.currency}</span>
        {entry.description && <span>{entry.description}</span>}
        {entry.category && <span className="page-tags">{entry.category}</span>}
        <time>{new Date(entry.date).toLocaleDateString("es-ES")}</time>
      </div>
      <button className="finance-item__btn-delete" onClick={() => setConfirmDelete(true)} title="Eliminar"><span className="material-symbols-outlined">delete</span></button>
      <button className="finance-item__edit-btn" onClick={() => setEditing(true)} title="Editar">✎</button>
    </li>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const FinanceView = (): ReactNode  => {
  const [entries, setEntries] = useState<FinanceEntrySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FinancialEntryType | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/finance/api");
      const body = (await res.json()) as { data: FinanceEntrySummary[]; total: number };
      setEntries(body.data);
      setTotal(body.total);
    } catch {
      setError("Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEntries() // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => { /* handled inside fetchEntries */ })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchEntries]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  const filteredEntries = filterFinanceEntries(entries, searchQuery, filterType);
  const hasFilters = searchQuery.trim() !== "" || filterType !== "ALL";
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE)));
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Finanzas <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nuevo movimiento"}</button>
      </div>
      {showForm && (
        <FinanceCreateForm
          onCreated={() => { setShowForm(false); void fetchEntries(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="search"
          placeholder="Buscar movimientos..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
        <select
          className="filter-bar__select"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as FinancialEntryType | "ALL"); setPage(1); }}
        >
          <option value="ALL">Todos los tipos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="INCOME">Ingresos</option>
          <option value="RECURRING_CHARGE">Recurrentes</option>
          <option value="BALANCE_SNAPSHOT">Snapshots de saldo</option>
        </select>
        {hasFilters && (
          <button className="filter-bar__clear" onClick={() => { setSearchQuery(""); setFilterType("ALL"); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
        {hasFilters && (
          <span className="filter-bar__count">{filteredEntries.length} de {entries.length}</span>
        )}
      </div>
      {filteredEntries.length === 0
        ? <p className="page-empty">{hasFilters ? "No hay movimientos que coincidan con los filtros." : "No hay movimientos. Haz clic en \"+ Nuevo movimiento\" para registrar uno."}</p>
        : (
          <ul className="page-list">
            {paginatedEntries.map((entry) => (
              <FinanceEntryItem key={entry.id} entry={entry} onEdited={() => void fetchEntries()} onDeleted={() => void fetchEntries()} />
            ))}
          </ul>
        )
      }
      <Pagination currentPage={currentPage} totalItems={filteredEntries.length} pageSize={PAGE_SIZE} itemLabel="movimientos" onPageChange={setPage} />
    </div>
  );
}

export default FinanceView;
