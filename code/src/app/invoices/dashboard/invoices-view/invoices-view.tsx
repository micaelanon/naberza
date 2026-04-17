"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InvoiceSummary } from "@/modules/invoices";

// ─── Create form ──────────────────────────────────────────────────────────────

function InvoiceCreateForm({ onCreated, onCancel }: {
  onCreated: () => void;
  onCancel: () => void;
}): ReactNode {
  const [issuer, setIssuer] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !amount) { setError("Emisor y importe son obligatorios"); return; }
    setSaving(true);
    setError(null);
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="invoice-form" onSubmit={(e) => void handleSubmit(e)}>
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

// ─── List ─────────────────────────────────────────────────────────────────────

function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }): ReactNode {
  return (
    <ul className="page-list">
      {invoices.map((inv) => (
        <li key={inv.id} className="page-list-item">
          <strong>{inv.issuer}</strong>
          <span className="page-amount">{Number(inv.amount).toFixed(2)} €</span>
          <span className={`page-badge page-badge--${inv.status.toLowerCase()}`}>{inv.status}</span>
          {inv.dueDate && <time>{new Date(inv.dueDate).toLocaleDateString("es-ES")}</time>}
        </li>
      ))}
    </ul>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function InvoicesView(): ReactNode {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  useEffect(() => { void fetchInvoices(); }, [fetchInvoices]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Facturas <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nueva factura"}</button>
      </div>
      {showForm && <InvoiceCreateForm onCreated={() => { setShowForm(false); void fetchInvoices(); }} onCancel={() => setShowForm(false)} />}
      {invoices.length === 0
        ? <p className="page-empty">No hay facturas. Haz clic en &quot;+ Nueva factura&quot; para registrar una.</p>
        : <InvoiceList invoices={invoices} />}
    </div>
  );
}
