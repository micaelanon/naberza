"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { FinanceEntrySummary } from "@/modules/finance";

export default function FinanceView(): ReactNode {
  const [entries, setEntries] = useState<FinanceEntrySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/finance/api")
      .then((res) => res.json())
      .then((body: { data: FinanceEntrySummary[]; total: number }) => {
        setEntries(body.data);
        setTotal(body.total);
      })
      .catch(() => setError("Failed to load finance entries"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Finance <span className="count">({total})</span></h1>
      {entries.length === 0 ? (
        <p className="page-empty">No finance entries yet.</p>
      ) : (
        <ul className="finance-list">
          {entries.map((entry) => (
            <li key={entry.id} className="finance-item">
              <span className={`finance-item__type finance-item__type--${entry.type.toLowerCase()}`}>
                {entry.type}
              </span>
              <span className="finance-item__amount">{entry.amount} {entry.currency}</span>
              {entry.category && (
                <span className="finance-item__category">{entry.category}</span>
              )}
              {entry.isAnomaly && (
                <span className="finance-item__anomaly">⚠ anomaly</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
