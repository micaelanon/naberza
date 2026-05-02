"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { SubscriptionSummary } from "@/modules/subscriptions";
import type { BillingCycle, SubscriptionStatus } from "@/modules/subscriptions/subscription.types";

const labels: Record<string, string> = { MONTHLY: "/mes", QUARTERLY: "/trimestre", ANNUAL: "/año", ONE_TIME: "único" };

function formatAmount(amount: string, currency: string): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function CreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [nextRenewalAt, setNextRenewalAt] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [alertDaysBefore, setAlertDaysBefore] = useState("7");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.subscriptions.toast.created")),
    onError: (msg) => showToast(msg, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || !nextRenewalAt) { setError("Name, amount and renewal date required"); return; }
    void submit(async () => {
      const res = await fetch("/subscriptions/api", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), provider: provider.trim() || undefined,
          amount: Number(amount), currency, billingCycle, nextRenewalAt,
          url: url.trim() || undefined, notes: notes.trim() || undefined,
          alertDaysBefore: Number(alertDaysBefore),
        }),
      });
      if (!res.ok) throw new Error(t("app.subscriptions.error.create"));
      setName(""); setProvider(""); setAmount(""); setNextRenewalAt(""); setUrl(""); setNotes(""); setAlertDaysBefore("7");
      onCreated();
    });
  }, [name, provider, amount, currency, billingCycle, nextRenewalAt, url, notes, alertDaysBefore, onCreated, setError, submit, t]);

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" placeholder={t("app.subscriptions.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className="idea-form__input idea-form__input--price" type="text" placeholder={t("app.subscriptions.providerPlaceholder")} value={provider} onChange={(e) => setProvider(e.target.value)} />
      </div>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--price" type="number" step="0.01" placeholder={t("app.subscriptions.amountPlaceholder")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="idea-form__select" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="EUR">EUR</option><option value="USD">USD</option></select>
        <select className="idea-form__select" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>
          <option value="MONTHLY">Mensual</option><option value="QUARTERLY">Trimestral</option><option value="ANNUAL">Anual</option><option value="ONE_TIME">Único</option>
        </select>
        <input className="idea-form__input idea-form__input--date" type="date" value={nextRenewalAt} onChange={(e) => setNextRenewalAt(e.target.value)} />
      </div>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="url" placeholder={t("app.subscriptions.urlPlaceholder")} value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="idea-form__input idea-form__input--price" type="number" placeholder={t("app.subscriptions.alertDaysPlaceholder")} value={alertDaysBefore} onChange={(e) => setAlertDaysBefore(e.target.value)} />
      </div>
      <textarea className="idea-form__textarea" placeholder={t("app.subscriptions.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.subscriptions.action.create")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
}

function EditForm({ sub, onSaved, onCancel }: { sub: SubscriptionSummary; onSaved: () => void; onCancel: () => void }): ReactNode {
  const t = useTranslations();
  const [name, setName] = useState(sub.name);
  const [provider, setProvider] = useState(sub.provider ?? "");
  const [amount, setAmount] = useState(sub.amount);
  const [currency, setCurrency] = useState(sub.currency);
  const [billingCycle, setBillingCycle] = useState(sub.billingCycle as BillingCycle);
  const [status, setStatus] = useState(sub.status as SubscriptionStatus);
  const [nextRenewalAt, setNextRenewalAt] = useState(new Date(sub.nextRenewalAt).toISOString().slice(0, 10));
  const [url, setUrl] = useState(sub.url ?? "");
  const [notes, setNotes] = useState(sub.notes ?? "");
  const [alertDaysBefore, setAlertDaysBefore] = useState(String(sub.alertDaysBefore));
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (msg) => showToast(msg, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("app.subscriptions.error.requiredName")); return; }
    void submit(async () => {
      const res = await fetch(`/subscriptions/api/${sub.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), provider: provider.trim() || undefined,
          amount: Number(amount), currency, billingCycle, status,
          nextRenewalAt, url: url.trim() || undefined, notes: notes.trim() || undefined,
          alertDaysBefore: Number(alertDaysBefore),
        }),
      });
      if (!res.ok) throw new Error(t("app.subscriptions.error.save"));
      onSaved();
    });
  }, [name, provider, amount, currency, billingCycle, status, nextRenewalAt, url, notes, alertDaysBefore, sub.id, setError, submit, t, onSaved]);

  return (
    <form className="idea-form idea-form--edit" onSubmit={handleSubmit}>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className="idea-form__input idea-form__input--price" value={provider} onChange={(e) => setProvider(e.target.value)} />
      </div>
      <div className="idea-form__row">
        <input type="number" step="0.01" className="idea-form__input idea-form__input--price" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select className="idea-form__select" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="EUR">EUR</option><option value="USD">USD</option></select>
        <select className="idea-form__select" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>
          <option value="MONTHLY">Mensual</option><option value="QUARTERLY">Trimestral</option><option value="ANNUAL">Anual</option><option value="ONE_TIME">Único</option>
        </select>
        <input type="date" className="idea-form__input idea-form__input--date" value={nextRenewalAt} onChange={(e) => setNextRenewalAt(e.target.value)} />
      </div>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input type="number" className="idea-form__input idea-form__input--price" value={alertDaysBefore} onChange={(e) => setAlertDaysBefore(e.target.value)} />
        <select className="idea-form__select" value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
          <option value="ACTIVE">Activa</option><option value="CANCELLED">Cancelada</option><option value="PAUSED">Pausada</option>
        </select>
      </div>
      <textarea className="idea-form__textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.subscriptions.action.save")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
}

const NOW_MS = Date.now();
function SubscriptionsView(): ReactNode {
  const t = useTranslations();
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [monthly, setMonthly] = useState(0);
  const [annual, setAnnual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/subscriptions/api");
      const body = (await res.json()) as { data: SubscriptionSummary[]; meta: { monthly: number; annual: number } };
      setSubscriptions(body.data);
      setMonthly(body.meta.monthly);
      setAnnual(body.meta.annual);
      setError(null);
    } catch { setError(t("app.subscriptions.error.load")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { let m = true; (async () => { try { const r = await fetch("/subscriptions/api"); const b = (await r.json()) as { data: SubscriptionSummary[]; meta: { monthly: number; annual: number } }; if (m) { setSubscriptions(b.data); setMonthly(b.meta.monthly); setAnnual(b.meta.annual); } } catch { if (m) setError(t("app.subscriptions.error.load")); } finally { if (m) setLoading(false); } })(); return () => { m = false; }; }, [t]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true);
    try { await fetch(`/subscriptions/api/${id}`, { method: "DELETE" }); setConfirmDelete(null); showToast(t("app.subscriptions.toast.deleted")); void fetchItems(); }
    catch { showToast(t("app.subscriptions.error.delete"), "error"); }
    finally { setDeleting(false); }
  }, [fetchItems, showToast, t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t("app.subscriptions.title")} <span className="count">({subscriptions.length})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : t("app.subscriptions.action.new")}</button>
      </div>
      <div className="filter-bar" style={{ justifyContent: "flex-start", gap: "1rem", fontSize: "0.875rem" }}>
        <span><strong>{t("app.subscriptions.monthly")}:</strong> {monthly.toFixed(2)} EUR</span>
        <span><strong>{t("app.subscriptions.annual")}:</strong> {annual.toFixed(2)} EUR</span>
      </div>
      {showForm && <CreateForm onCreated={() => { setShowForm(false); void fetchItems(); }} onCancel={() => setShowForm(false)} />}
      {subscriptions.length === 0
        ? <p className="page-empty">{t("app.subscriptions.empty.default")}</p>
        : <ul className="page-list">
            {subscriptions.map((sub) => {
              const renewalMs = new Date(sub.nextRenewalAt).getTime();
              const isExpiring = renewalMs - NOW_MS < sub.alertDaysBefore * 86400000 && renewalMs > NOW_MS;
              if (editingId === sub.id) {
                return <li key={sub.id} className="idea-item idea-item--editing"><EditForm sub={sub} onSaved={() => { setEditingId(null); void fetchItems(); }} onCancel={() => setEditingId(null)} /></li>;
              }
              return (
                <li key={sub.id} className={`page-list-item idea-item ${isExpiring ? "idea-item--urgent" : ""}`}>
                  <ConfirmDeleteModal isOpen={confirmDelete === sub.id} itemName={sub.name} onConfirm={() => void handleDelete(sub.id)} onCancel={() => setConfirmDelete(null)} deleting={deleting} />
                  <div className="idea-item__main">
                    <strong>{sub.name}</strong>
                    {sub.provider && <span className="page-badge">{sub.provider}</span>}
                    <span className="page-badge">{formatAmount(sub.amount, sub.currency)}{labels[sub.billingCycle]}</span>
                    <span className="page-badge">{new Date(sub.nextRenewalAt).toLocaleDateString("es-ES")}</span>
                    {sub.status !== "ACTIVE" && <span className="page-badge">{sub.status}</span>}
                    {isExpiring && <span className="page-badge" style={{ color: "#c0392b" }}>⚠️ Próximo</span>}
                    {sub.url && <a href={sub.url} target="_blank" rel="noopener noreferrer">🔗</a>}
                  </div>
                  <button className="idea-item__edit-btn" onClick={() => setEditingId(sub.id)} title={t("app.common.edit")}>✎</button>
                  <button className="idea-item__btn-delete" onClick={() => setConfirmDelete(sub.id)} title={t("app.common.delete")}><span className="material-symbols-outlined">delete</span></button>
                </li>
              );
            })}
          </ul>}
    </div>
  );
}

export default SubscriptionsView;
