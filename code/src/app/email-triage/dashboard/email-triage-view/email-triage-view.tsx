"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { useEmailTriage } from "./use-email-triage";
import type { ItemApiResponse } from "./utils/types";
import "./email-triage-view.css";

function groupByCategory(items: ItemApiResponse[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const cat = item.aiCategory ?? "other";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return map;
}

const SECTION_LABELS: Record<string, { icon: string; label: string }> = {
  trash: { icon: "🗑️", label: "Mover a papelera" },
  archive: { icon: "📦", label: "Archivar" },
  keep: { icon: "✅", label: "Conservar" },
  review: { icon: "⚠️", label: "Revisar tú" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", FETCHING: "Descargando...", CLASSIFYING: "Clasificando con IA...",
  READY: "Listo", EXECUTING: "Ejecutando...", DONE: "Completado", FAILED: "Falló",
};

function ProgressView({ progressPct, viewState }: { progressPct: number; viewState: string }): ReactNode {
  const label = viewState === "fetching" ? "Descargando emails..." : "Clasificando con IA...";
  return (
    <div className="email-triage-view__progress">
      <div className="email-triage-view__progress-bar">
        <div className="email-triage-view__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="email-triage-view__progress-text">{label}</p>
    </div>
  );
}

function SectionGroup({
  category, count, sessionId, categoryKey, onOverride,
}: {
  category: string; count: number; sessionId: string | null; categoryKey: string; onOverride: (sid: string, cat: string, decision: string) => void;
}): ReactNode {
  return (
    <div className="email-triage-section__group">
      <span className="email-triage-section__group-category">{category}</span>
      <span className="email-triage-section__group-count">{count} correos</span>
      {sessionId && categoryKey !== "keep" && (
        <button
          className="email-triage-section__group-override"
          onClick={() => onOverride(sessionId, category, categoryKey === "trash" ? "KEEP" : "TRASH")}
        >
          {categoryKey === "trash" ? "Conservar" : "Papelera"}
        </button>
      )}
    </div>
  );
}

function SectionPanel({
  key_, sessionId, items, collapsed, onToggle, onOverride,
}: {
  key_: string; sessionId: string | null; items: ItemApiResponse[]; collapsed: boolean;
  onToggle: (k: string) => void; onOverride: (sid: string, cat: string, d: string) => void;
}): ReactNode {
  const info = SECTION_LABELS[key_];
  if (items.length === 0) return null;
  const categories = groupByCategory(items);
  return (
    <div className="email-triage-section">
      <div className="email-triage-section__header" onClick={() => onToggle(key_)}>
        <span className="email-triage-section__icon">{info.icon}</span>
        <span className="email-triage-section__label">{info.label}</span>
        <span className="email-triage-section__count">{items.length}</span>
      </div>
      {!collapsed && (
        <div className="email-triage-section__body">
          {Array.from(categories.entries()).map(([cat, count]) => (
            <SectionGroup key={cat} category={cat} count={count} sessionId={sessionId} categoryKey={key_} onOverride={onOverride} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryList({ history }: { history: Array<{ id: string; status: string; trashCount: number; archiveCount: number; keepCount: number; reviewCount: number; createdAt: string }> }): ReactNode {
  if (history.length === 0) return null;
  return (
    <div className="email-triage-view__history">
      <h3 className="email-triage-view__history-title">Sesiones anteriores</h3>
      {history.map((s) => {
        const colorMap: Record<string, string> = { DONE: "#27ae60", FAILED: "#c0392b" };
        return (
          <div key={s.id} className="email-triage-view__history-item">
            <span className="email-triage-view__history-status" style={{ color: colorMap[s.status] ?? "#888" }}>
              {STATUS_LABELS[s.status] ?? s.status}
            </span>
            <span>{s.trashCount} papelera · {s.archiveCount} archivo · {s.keepCount} conservar · {s.reviewCount} revisar</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
              {new Date(s.createdAt).toLocaleString("es-ES")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function IdleView({ onStart, history }: { onStart: () => void; history: Array<{ id: string; status: string; trashCount: number; archiveCount: number; keepCount: number; reviewCount: number; createdAt: string }> }): ReactNode {
  return (
    <div className="email-triage-view">
      <header className="email-triage-view__header">
        <h1 className="email-triage-view__title">Triage de correo</h1>
        <p className="email-triage-view__subtitle">Analiza tu inbox con IA para decidir qué correos archivar, conservar o mover a la papelera.</p>
      </header>
      <div className="email-triage-view__actions">
        <button className="email-triage-view__start-btn" onClick={onStart}>Analizar inbox con IA</button>
      </div>
      <p className="email-triage-view__warning">
        La IA analizará hasta 500 emails. Los emails con adjuntos PDF y los de menos de 48 horas nunca se borrarán automáticamente. Siempre podrás revisar las decisiones antes de ejecutar.
      </p>
      <HistoryList history={history} />
    </div>
  );
}

function ExecutePanel({
  trashCount, executing, showConfirm, setShowConfirm, onExecute,
}: {
  trashCount: number; executing: boolean; showConfirm: boolean; setShowConfirm: (v: boolean) => void; onExecute: () => void;
}): ReactNode {
  return (
    <div className="email-triage-view__execute">
      {showConfirm ? (
        <div className="email-triage-view__confirm">
          <p className="email-triage-view__confirm-text">¿Mover {trashCount} correos a la papelera? Gmail los retiene 30 días.</p>
          <div className="email-triage-view__confirm-actions">
            <button className="email-triage-view__confirm-yes" onClick={onExecute} disabled={executing}>
              {executing ? "Ejecutando..." : "Sí, mover a papelera"}
            </button>
            <button className="email-triage-view__confirm-no" onClick={() => setShowConfirm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <button className="email-triage-view__execute-btn" onClick={() => setShowConfirm(true)} disabled={trashCount === 0}>
            Mover {trashCount} correos a la papelera
          </button>
          <span className="email-triage-view__execute-info">Dry run: los correos no se moverán hasta que confirmes.</span>
        </>
      )}
    </div>
  );
}

function ReadyView({
  session, grouped, sessionId, collapsed, onToggle, onOverride, error, showConfirm, setShowConfirm, onExecute, executing,
}: {
  session: { totalProcessed: number } | null; grouped: { trash: ItemApiResponse[]; archive: ItemApiResponse[]; keep: ItemApiResponse[]; review: ItemApiResponse[] };
  sessionId: string | null; collapsed: Set<string>; onToggle: (k: string) => void;
  onOverride: (sid: string, cat: string, d: string) => void; error: string | null;
  showConfirm: boolean; setShowConfirm: (v: boolean) => void; onExecute: () => void; executing: boolean;
}): ReactNode {
  return (
    <div className="email-triage-view">
      <header className="email-triage-view__header">
        <h1 className="email-triage-view__title">Resultados del triage</h1>
        <p className="email-triage-view__subtitle">{session?.totalProcessed ?? 0} correos analizados</p>
      </header>
      {error && <div className="email-triage-view__error" role="alert">{error}</div>}
      <div className="email-triage-view__sections">
        {(["trash", "archive", "keep", "review"] as const).map((k) => (
          <SectionPanel key={k} key_={k} sessionId={sessionId} items={grouped[k]} collapsed={collapsed.has(k)} onToggle={onToggle} onOverride={onOverride} />
        ))}
      </div>
      <ExecutePanel trashCount={grouped.trash.length} executing={executing} showConfirm={showConfirm} setShowConfirm={setShowConfirm} onExecute={onExecute} />
    </div>
  );
}

function buildDoneText(executeResult: { trashed: number; errors: number } | null): string {
  if (!executeResult) return "Operación completada";
  const base = `${executeResult.trashed} correos movidos a la papelera`;
  return executeResult.errors > 0 ? `${base} (${executeResult.errors} errores)` : base;
}

function DoneView({ executeResult, onReset }: { executeResult: { trashed: number; errors: number } | null; onReset: () => void }): ReactNode {
  const doneText = buildDoneText(executeResult);

  return (
    <div className="email-triage-view">
      <div className="email-triage-view__done">
        <div className="email-triage-view__done-icon">✅</div>
        <p className="email-triage-view__done-text">{doneText}</p>
        <button className="email-triage-view__start-btn" onClick={onReset} style={{ marginTop: "1rem" }}>Nueva sesión</button>
      </div>
    </div>
  );
}

function FailedView({ error, onReset }: { error: string | null; onReset: () => void }): ReactNode {
  return (
    <div className="email-triage-view">
      <div className="email-triage-view__failed">
        <p>La sesión de triage falló.</p>
        {error && <p>{error}</p>}
        <button className="email-triage-view__start-btn" onClick={onReset} style={{ marginTop: "1rem" }}>Reintentar</button>
      </div>
    </div>
  );
}

function EmailTriageView(): ReactNode {
  const {
    viewState, sessionId, session, executing, showConfirm,
    executeResult, error, history, collapsed, grouped,
    setShowConfirm, toggleCollapse, startTriage, execute,
    overrideCategory, reset, progressPct,
  } = useEmailTriage();

  const onOverride = useMemo(() => overrideCategory, [overrideCategory]);
  const onToggle = useMemo(() => toggleCollapse, [toggleCollapse]);
  const onStart = useMemo(() => startTriage, [startTriage]);
  const onExecute = useMemo(() => execute, [execute]);
  const onReset = useMemo(() => reset, [reset]);

  switch (viewState) {
    case "idle":
      return <IdleView onStart={onStart} history={history} />;
    case "fetching":
    case "classifying":
      return <ProgressView progressPct={progressPct} viewState={viewState} />;
    case "ready":
      return (
        <ReadyView
          session={session} grouped={grouped} sessionId={sessionId}
          collapsed={collapsed} onToggle={onToggle} onOverride={onOverride}
          error={error} showConfirm={showConfirm} setShowConfirm={setShowConfirm}
          onExecute={onExecute} executing={executing}
        />
      );
    case "executing":
      return <ProgressView progressPct={90} viewState="executing" />;
    case "done":
      return <DoneView executeResult={executeResult} onReset={onReset} />;
    case "failed":
      return <FailedView error={error} onReset={onReset} />;
    default:
      return null;
  }
}

export default EmailTriageView;
