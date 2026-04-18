"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { FinanceEntrySummary } from "@/modules/finance";
import type { FinancialEntryType } from "@/modules/finance/finance.types";

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  BALANCE_SNAPSHOT: "Saldo",
  RECURRING_CHARGE: "Recurrente",
};

// ─── Create form ──────────────────────────────────────────────────────────────

function FinanceCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const [type, setType] = useState<FinancialEntryType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) { setError("El importe es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
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
      setAmount(""); setDescription(""); setCategory("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

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

function FinanceEditForm({ entry, onSaved, onCancel }: {
  entry: FinanceEntrySummary;
  onSaved: () => void;
  onCancel: () => void;
}): ReactNode {
  const [type, setType] = useState<FinancialEntryType>(entry.type);
  const [amount, setAmount] = useState(String(Number(entry.amount)));
  const [description, setDescription] = useState(entry.description ?? "");
  const [category, setCategory] = useState(entry.category ?? "");
  const [date, setDate] = useState(new Date(entry.date).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) { setError("El importe es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

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

function FinanceEntryItem({ entry, onEdited }: { entry: FinanceEntrySummary; onEdited: () => void }): ReactNode {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="page-list-item finance-item--editing">
        <FinanceEditForm entry={entry} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="page-list-item finance-item">
      <div className="finance-item__main">
        <span className={`page-badge page-badge--${entry.type.toLowerCase()}`}>{TYPE_LABELS[entry.type] ?? entry.type}</span>
        <span className="page-amount">{Number(entry.amount).toFixed(2)} {entry.currency}</span>
        {entry.description && <span>{entry.description}</span>}
        {entry.category && <span className="page-tags">{entry.category}</span>}
        <time>{new Date(entry.date).toLocaleDateString("es-ES")}</time>
      </div>
      <button className="finance-item__edit-btn" onClick={() => setEditing(true)} title="Editar">✎</button>
    </li>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function FinanceView(): ReactNode {
  const [entries, setEntries] = useState<FinanceEntrySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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
      {entries.length === 0
        ? <p className="page-empty">No hay movimientos. Haz clic en &quot;+ Nuevo movimiento&quot; para registrar uno.</p>
        : (
          <ul className="page-list">
            {entries.map((entry) => (
              <FinanceEntryItem key={entry.id} entry={entry} onEdited={() => void fetchEntries()} />
            ))}
          </ul>
        )
      }
    </div>
  );
}
