"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useEmailTriage } from "./use-email-triage";
import type { ItemApiResponse } from "./utils/types";
import "./email-triage-view.css";

const SECTION_ICONS: Record<string, string> = {
  trash: "delete_sweep",
  archive: "archive",
  keep: "check_circle",
  review: "warning",
};

const STATUS_CSS: Record<string, string> = {
  DONE: "email-triage-view__history-status--done",
  FAILED: "email-triage-view__history-status--failed",
};

type SessionStatus = "PENDING" | "FETCHING" | "CLASSIFYING" | "READY" | "EXECUTING" | "DONE" | "FAILED";

function groupByCategory(items: ItemApiResponse[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const cat = item.aiCategory ?? "other";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return map;
}

function ProgressView({ progressPct, viewState }: { progressPct: number; viewState: string }): ReactNode {
  const t = useTranslations();
  const progressLabels: Record<string, string> = {
    classifying: t("app.emailTriage.progress.classifying"),
    executing: t("app.emailTriage.progress.executing"),
  };
  const label = progressLabels[viewState] ?? t("app.emailTriage.progress.fetching");

  return (
    <div className="email-triage-view__progress">
      <div className="email-triage-view__progress-bar">
        <div className="email-triage-view__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="email-triage-view__progress-text">{label}</p>
    </div>
  );
}

function ItemRow({ item }: { item: ItemApiResponse }): ReactNode {
  return (
    <div className="email-triage-section__item-row">
      <div className="email-triage-section__item-row-main">
        <span className="email-triage-section__item-subject">{item.subject}</span>
        <span className="email-triage-section__item-from">{item.fromAddress}</span>
      </div>
      <div className="email-triage-section__item-row-meta">
        <span className="email-triage-section__item-date">
          {new Date(item.emailDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        {item.aiReason && <span className="email-triage-section__item-reason">{item.aiReason}</span>}
      </div>
    </div>
  );
}

function SectionGroup({
  category, items, sessionId, categoryKey, onOverride,
}: {
  category: string;
  items: ItemApiResponse[];
  sessionId: string | null;
  categoryKey: string;
  onOverride: (sid: string, cat: string, decision: string) => void;
}): ReactNode {
  const t = useTranslations();
  const overrideLabel = categoryKey === "trash"
    ? t("app.emailTriage.results.override.keep")
    : t("app.emailTriage.results.override.trash");
  const overrideDecision = categoryKey === "trash" ? "KEEP" : "TRASH";

  return (
    <div className="email-triage-section__group">
      <div className="email-triage-section__group-header">
        <span className="email-triage-section__group-category">{category}</span>
        <span className="email-triage-section__group-count">
          {t("app.emailTriage.emailCount", { count: items.length })}
        </span>
        {sessionId && categoryKey !== "keep" && (
          <button
            className="email-triage-section__group-override"
            onClick={() => onOverride(sessionId, category, overrideDecision)}
          >
            {overrideLabel}
          </button>
        )}
      </div>
      <div className="email-triage-section__group-body">
        {items.slice(0, 20).map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
        {items.length > 20 && (
          <div className="email-triage-section__group-more">
            {t("app.emailTriage.moreEmails", { count: items.length - 20 })}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionPanel({
  sectionKey, sessionId, items, collapsed, onToggle, onOverride,
}: {
  sectionKey: string;
  sessionId: string | null;
  items: ItemApiResponse[];
  collapsed: boolean;
  onToggle: (k: string) => void;
  onOverride: (sid: string, cat: string, d: string) => void;
}): ReactNode {
  const t = useTranslations();
  const icon = SECTION_ICONS[sectionKey] ?? "inbox";

  if (items.length === 0) return null;

  const categories = groupByCategory(items);
  const itemsByCategory = new Map<string, ItemApiResponse[]>();
  for (const item of items) {
    const cat = item.aiCategory ?? "other";
    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
    itemsByCategory.get(cat)!.push(item);
  }

  return (
    <div className="email-triage-section">
      <div className="email-triage-section__header" onClick={() => onToggle(sectionKey)}>
        <span className="material-symbols-outlined email-triage-section__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="email-triage-section__label">
          {t(`app.emailTriage.results.section.${sectionKey}` as Parameters<typeof t>[0])}
        </span>
        <span className="email-triage-section__count">{items.length}</span>
      </div>
      {!collapsed && (
        <div className="email-triage-section__body">
          {Array.from(categories.keys()).map((cat) => (
            <SectionGroup
              key={cat}
              category={cat}
              items={itemsByCategory.get(cat) ?? []}
              sessionId={sessionId}
              categoryKey={sectionKey}
              onOverride={onOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryList({ history }: {
  history: Array<{
    id: string;
    status: string;
    trashCount: number;
    archiveCount: number;
    keepCount: number;
    reviewCount: number;
    createdAt: string;
  }>;
}): ReactNode {
  const t = useTranslations();
  if (history.length === 0) return null;

  return (
    <div className="email-triage-view__history">
      <h3 className="email-triage-view__history-title">{t("app.emailTriage.history.title")}</h3>
      {history.map((s) => {
        const statusLabels: Record<string, string> = {
          PENDING: t("app.emailTriage.status.pending"),
          FETCHING: t("app.emailTriage.status.fetching"),
          CLASSIFYING: t("app.emailTriage.status.classifying"),
          READY: t("app.emailTriage.status.ready"),
          EXECUTING: t("app.emailTriage.status.executing"),
          DONE: t("app.emailTriage.status.done"),
          FAILED: t("app.emailTriage.status.failed"),
        };
        const statusLabel = statusLabels[s.status] ?? s.status;
        const statusClass = `email-triage-view__history-status ${STATUS_CSS[s.status as SessionStatus] ?? "email-triage-view__history-status--default"}`;
        return (
          <div key={s.id} className="email-triage-view__history-item">
            <span className={statusClass}>{statusLabel}</span>
            <span>
              {s.trashCount} {t("app.emailTriage.results.section.trash").toLowerCase()} ·{" "}
              {s.archiveCount} {t("app.emailTriage.results.section.archive").toLowerCase()} ·{" "}
              {s.keepCount} {t("app.emailTriage.results.section.keep").toLowerCase()} ·{" "}
              {s.reviewCount} {t("app.emailTriage.results.section.review").toLowerCase()}
            </span>
            <span className="email-triage-view__history-date">
              {new Date(s.createdAt).toLocaleString("es-ES")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function IdleView({ onStart, history }: {
  onStart: () => void;
  history: Array<{
    id: string;
    status: string;
    trashCount: number;
    archiveCount: number;
    keepCount: number;
    reviewCount: number;
    createdAt: string;
  }>;
}): ReactNode {
  const t = useTranslations();
  return (
    <div className="email-triage-view">
      <header className="email-triage-view__header">
        <h1 className="email-triage-view__title">{t("app.emailTriage.title")}</h1>
        <p className="email-triage-view__subtitle">{t("app.emailTriage.subtitle")}</p>
      </header>
      <div className="email-triage-view__actions">
        <button className="email-triage-view__start-btn" onClick={onStart}>
          {t("app.emailTriage.startBtn")}
        </button>
      </div>
      <p className="email-triage-view__warning">{t("app.emailTriage.warning")}</p>
      <HistoryList history={history} />
    </div>
  );
}

function ExecutePanel({
  trashCount, executing, showConfirm, setShowConfirm, onExecute,
}: {
  trashCount: number;
  executing: boolean;
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  onExecute: () => void;
}): ReactNode {
  const t = useTranslations();
  return (
    <div className="email-triage-view__execute">
      {showConfirm ? (
        <div className="email-triage-view__confirm">
          <p className="email-triage-view__confirm-text">
            {t("app.emailTriage.results.confirm", { count: trashCount })}
          </p>
          <div className="email-triage-view__confirm-actions">
            <button className="email-triage-view__confirm-yes" onClick={onExecute} disabled={executing}>
              {executing ? t("app.emailTriage.progress.executing") : t("app.emailTriage.results.confirmYes")}
            </button>
            <button className="email-triage-view__confirm-no" onClick={() => setShowConfirm(false)}>
              {t("app.emailTriage.results.confirmNo")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            className="email-triage-view__execute-btn"
            onClick={() => setShowConfirm(true)}
            disabled={trashCount === 0}
          >
            {t("app.emailTriage.results.execute", { count: trashCount })}
          </button>
          <span className="email-triage-view__execute-info">
            {t("app.emailTriage.results.dryRun")}
          </span>
        </>
      )}
    </div>
  );
}

function ReadyView({
  session, grouped, sessionId, collapsed, onToggle, onOverride, error,
  showConfirm, setShowConfirm, onExecute, executing,
}: {
  session: { totalProcessed: number } | null;
  grouped: { trash: ItemApiResponse[]; archive: ItemApiResponse[]; keep: ItemApiResponse[]; review: ItemApiResponse[] };
  sessionId: string | null;
  collapsed: Set<string>;
  onToggle: (k: string) => void;
  onOverride: (sid: string, cat: string, d: string) => void;
  error: string | null;
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  onExecute: () => void;
  executing: boolean;
}): ReactNode {
  const t = useTranslations();
  return (
    <div className="email-triage-view">
      <header className="email-triage-view__header">
        <h1 className="email-triage-view__title">{t("app.emailTriage.results.title")}</h1>
        <p className="email-triage-view__subtitle">
          {t("app.emailTriage.results.count", { count: session?.totalProcessed ?? 0 })}
        </p>
      </header>
      {error && <div className="email-triage-view__error" role="alert">{error}</div>}
      <div className="email-triage-view__sections">
        {(["trash", "archive", "keep", "review"] as const).map((k) => (
          <SectionPanel
            key={k}
            sectionKey={k}
            sessionId={sessionId}
            items={grouped[k]}
            collapsed={collapsed.has(k)}
            onToggle={onToggle}
            onOverride={onOverride}
          />
        ))}
      </div>
      <ExecutePanel
        trashCount={grouped.trash.length}
        executing={executing}
        showConfirm={showConfirm}
        setShowConfirm={setShowConfirm}
        onExecute={onExecute}
      />
    </div>
  );
}

function DoneView({ executeResult, onReset }: {
  executeResult: { trashed: number; errors: number } | null;
  onReset: () => void;
}): ReactNode {
  const t = useTranslations();
  let doneText = t("app.emailTriage.results.operationDone");
  if (executeResult) {
    doneText = executeResult.errors > 0
      ? t("app.emailTriage.results.doneErrors", { trashed: executeResult.trashed, errors: executeResult.errors })
      : t("app.emailTriage.results.done", { trashed: executeResult.trashed });
  }

  return (
    <div className="email-triage-view">
      <div className="email-triage-view__done">
        <span className="material-symbols-outlined email-triage-view__done-icon" aria-hidden="true">
          check_circle
        </span>
        <p className="email-triage-view__done-text">{doneText}</p>
        <button className="email-triage-view__start-btn email-triage-view__done-action" onClick={onReset}>
          {t("app.emailTriage.results.newSession")}
        </button>
      </div>
    </div>
  );
}

function FailedView({ error, onReset }: { error: string | null; onReset: () => void }): ReactNode {
  const t = useTranslations();
  return (
    <div className="email-triage-view">
      <div className="email-triage-view__failed">
        <p>{t("app.emailTriage.error.failed")}</p>
        {error && <p className="email-triage-view__failed-detail">{error}</p>}
        <button className="email-triage-view__start-btn email-triage-view__failed-action" onClick={onReset}>
          {t("app.emailTriage.startBtn")}
        </button>
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

  switch (viewState) {
    case "idle":
      return <IdleView onStart={startTriage} history={history} />;
    case "fetching":
    case "classifying":
      return <ProgressView progressPct={progressPct} viewState={viewState} />;
    case "ready":
      return (
        <ReadyView
          session={session}
          grouped={grouped}
          sessionId={sessionId}
          collapsed={collapsed}
          onToggle={onToggle}
          onOverride={onOverride}
          error={error}
          showConfirm={showConfirm}
          setShowConfirm={setShowConfirm}
          onExecute={execute}
          executing={executing}
        />
      );
    case "executing":
      return <ProgressView progressPct={90} viewState="executing" />;
    case "done":
      return <DoneView executeResult={executeResult} onReset={reset} />;
    case "failed":
      return <FailedView error={error} onReset={reset} />;
    default:
      return null;
  }
}

export default EmailTriageView;
