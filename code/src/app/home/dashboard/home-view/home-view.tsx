"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { HomeEventSummary } from "@/modules/home";

export default function HomeView(): ReactNode {
  const [events, setEvents] = useState<HomeEventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/home/api/events?acknowledged=false&limit=20")
      .then((res) => res.json())
      .then((body: { data: HomeEventSummary[]; total: number }) => {
        setEvents(body.data);
        setTotal(body.total);
      })
      .catch(() => setError("Failed to load home events"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Home <span className="count">({total} pending)</span></h1>
      {events.length === 0 ? (
        <p className="page-empty">No pending home events.</p>
      ) : (
        <ul className="home-event-list">
          {events.map((evt) => (
            <li key={evt.id} className={`home-event-item home-event-item--${evt.severity.toLowerCase()}`}>
              <span className="home-event-item__entity">{evt.entityId}</span>
              <span className="home-event-item__state">{evt.state}</span>
              <span className="home-event-item__severity">{evt.severity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
