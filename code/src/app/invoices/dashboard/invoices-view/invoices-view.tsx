"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { InvoiceSummary } from "@/modules/invoices";

export default function InvoicesView(): ReactNode {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/invoices/api")
      .then((res) => res.json())
      .then((body: { data: InvoiceSummary[]; total: number }) => {
        setInvoices(body.data);
        setTotal(body.total);
      })
      .catch(() => setError("Failed to load invoices"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Invoices <span className="count">({total})</span></h1>
      {invoices.length === 0 ? (
        <p className="page-empty">No invoices yet.</p>
      ) : (
        <ul className="invoice-list">
          {invoices.map((inv) => (
            <li key={inv.id} className="invoice-item">
              <span className="invoice-item__issuer">{inv.issuer}</span>
              <span className="invoice-item__amount">{inv.amount} {inv.currency}</span>
              <span className={`invoice-item__status invoice-item__status--${inv.status.toLowerCase()}`}>
                {inv.status}
              </span>
              {inv.isRecurring && <span className="invoice-item__recurring">recurring</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
