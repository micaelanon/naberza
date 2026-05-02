"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SessionApiResponse, SessionDetailResponse, ViewState, GroupedItems } from "./utils/types";

function groupItems(items: SessionDetailResponse["items"]): GroupedItems {
  const groups: GroupedItems = { trash: [], archive: [], keep: [], review: [] };
  for (const item of items) {
    const key = item.effectiveDecision.toLowerCase() as keyof GroupedItems;
    if (key in groups) groups[key].push(item);
  }
  return groups;
}

function groupByCategory(items: SessionDetailResponse["items"]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const cat = item.aiCategory ?? "other";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return map;
}

export function useEmailTriage() {
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionApiResponse | null>(null);
  const [items, setItems] = useState<SessionDetailResponse["items"]>([]);
  const [executing, setExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executeResult, setExecuteResult] = useState<{ trashed: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SessionApiResponse[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => groupItems(items), [items]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const refreshSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/email-triage/${sid}`);
      if (!res.ok) return;
      const json = (await res.json()) as { data: SessionDetailResponse };
      setSession(json.data.session);
      setItems(json.data.items);
      const st = json.data.session.status.toLowerCase();
      if (st === "ready") setViewState("ready");
      else if (st === "done") setViewState("done");
      else if (st === "failed") setViewState("failed");
    } catch {
      // silent
    }
  }, []);

  const startTriage = useCallback(async () => {
    setError(null);
    setViewState("fetching");
    try {
      const res = await fetch("/api/email-triage", { method: "POST" });
      if (!res.ok) throw new Error("Error al iniciar el triage");
      const json = (await res.json()) as { data: { sessionId: string } };
      const sid = json.data.sessionId;
      setSessionId(sid);

      const poll = async () => {
        const r = await fetch(`/api/email-triage/${sid}`);
        if (!r.ok) { setViewState("failed"); return; }
        const body = (await r.json()) as { data: SessionDetailResponse };
        setSession(body.data.session);
        setItems(body.data.items);
        const st = body.data.session.status;
        if (st === "READY") { setViewState("ready"); }
        else if (st === "DONE") { setViewState("done"); }
        else if (st === "FAILED") { setViewState("failed"); }
        else {
          setViewState(st === "CLASSIFYING" ? "classifying" : "fetching");
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setViewState("failed");
      setError("No se pudo iniciar la sesión de triage");
    }
  }, []);

  const execute = useCallback(async () => {
    if (!sessionId) return;
    setExecuting(true);
    setViewState("executing");
    try {
      const res = await fetch(`/api/email-triage/${sessionId}/execute`, { method: "POST" });
      if (!res.ok) throw new Error("Error al ejecutar");
      const json = (await res.json()) as { data: { trashed: number; errors: number } };
      setExecuteResult(json.data);
      setViewState("done");
    } catch {
      setViewState("ready");
      setError("Error al ejecutar el borrado");
    } finally {
      setExecuting(false);
      setShowConfirm(false);
    }
  }, [sessionId]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/email-triage");
      if (!res.ok) return;
      const json = (await res.json()) as { data: SessionApiResponse[] };
      setHistory(json.data);
    } catch {
      // silent
    }
  }, []);

  const overrideCategory = useCallback(async (sid: string, category: string, newDecision: string) => {
    try {
      const res = await fetch(`/api/email-triage/${sid}/override-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiCategory: category, decision: newDecision }),
      });
      if (!res.ok) return;
      await refreshSession(sid);
    } catch {
      // silent
    }
  }, [refreshSession]);

  const reset = useCallback(() => {
    setViewState("idle");
    setSessionId(null);
    setSession(null);
    setItems([]);
    setExecuteResult(null);
    setError(null);
    setShowConfirm(false);
    void loadHistory();
  }, [loadHistory]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const progressPct = useMemo(() => {
    if (!session) return 0;
    if (session.totalFetched === 0) return 10;
    return Math.round((session.totalProcessed / session.totalFetched) * 100);
  }, [session]);

  return {
    viewState, sessionId, session, items, executing, showConfirm,
    executeResult, error, history, collapsed, grouped,
    setShowConfirm, toggleCollapse, startTriage, execute, loadHistory,
    overrideCategory, reset, refreshSession, groupByCategory, progressPct,
  };
}
