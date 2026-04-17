"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { AutomationRuleSummary, ApprovalRequestSummary } from "@/modules/automations";
import type { RuleItemProps, ApprovalItemProps } from "./utils/types";
import "./automations-view.css";

// ─── Rule item ────────────────────────────────────────────────────────────────

function RuleItem({ rule }: RuleItemProps): ReactNode {
  const statusClass = rule.enabled ? "rule-item__badge--active" : "rule-item__badge--inactive";
  return (
    <li className="rule-item">
      <div className="rule-item__header">
        <span className="rule-item__name">{rule.name}</span>
        <span className={`rule-item__badge ${statusClass}`}>
          {rule.enabled ? "active" : "disabled"}
        </span>
      </div>
      {rule.description && (
        <p className="rule-item__description">{rule.description}</p>
      )}
      <div className="rule-item__meta">
        <span className="rule-item__trigger">
          <span className="rule-item__meta-label">trigger</span>
          {rule.triggerEvent}
        </span>
        <span className="rule-item__stat">
          <span className="rule-item__meta-label">conditions</span>
          {rule.conditionCount}
        </span>
        <span className="rule-item__stat">
          <span className="rule-item__meta-label">actions</span>
          {rule.actionCount}
        </span>
        <span className="rule-item__stat">
          <span className="rule-item__meta-label">runs</span>
          {rule.executionCount}
        </span>
        {rule.requiresApproval && (
          <span className="rule-item__approval-flag">requires approval</span>
        )}
      </div>
    </li>
  );
}

// ─── Approval item ────────────────────────────────────────────────────────────

function ApprovalItem({ approval, onGrant, onDeny }: ApprovalItemProps): ReactNode {
  const [busy, setBusy] = useState(false);

  const handleGrant = useCallback(async () => {
    setBusy(true);
    onGrant(approval.id);
  }, [approval.id, onGrant]);

  const handleDeny = useCallback(async () => {
    setBusy(true);
    onDeny(approval.id);
  }, [approval.id, onDeny]);

  const expiresAt = new Date(approval.expiresAt);
  const isExpired = expiresAt < new Date();

  return (
    <li className="approval-item">
      <div className="approval-item__header">
        <span className="approval-item__rule">{approval.automationRuleName}</span>
        <span className={`approval-item__status approval-item__status--${approval.status.toLowerCase()}`}>
          {approval.status}
        </span>
      </div>
      <div className="approval-item__meta">
        <span className="approval-item__actions-count">{approval.proposedActions.length} actions proposed</span>
        <span className={`approval-item__expires${isExpired ? " approval-item__expires--expired" : ""}`}>
          {isExpired ? "expired" : `expires ${expiresAt.toLocaleDateString()}`}
        </span>
      </div>
      {approval.status === "PENDING" && !isExpired && (
        <div className="approval-item__controls">
          <button
            className="approval-item__btn approval-item__btn--grant"
            onClick={handleGrant}
            disabled={busy}
            type="button"
          >
            Grant
          </button>
          <button
            className="approval-item__btn approval-item__btn--deny"
            onClick={handleDeny}
            disabled={busy}
            type="button"
          >
            Deny
          </button>
        </div>
      )}
    </li>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

async function fetchAutomationsData() {
  const [rulesRes, approvalsRes] = await Promise.all([
    fetch("/automations/api/rules"),
    fetch("/automations/api/approvals?status=PENDING"),
  ]);
  const [rulesBody, approvalsBody]: [
    { data: AutomationRuleSummary[]; total: number },
    { data: ApprovalRequestSummary[]; total: number },
  ] = await Promise.all([rulesRes.json(), approvalsRes.json()]);
  return { rulesBody, approvalsBody };
}

async function grantApproval(id: string): Promise<void> {
  await fetch(`/automations/api/approvals/${id}/grant`, { method: "POST" });
}

async function denyApproval(id: string): Promise<void> {
  await fetch(`/automations/api/approvals/${id}/deny`, { method: "POST" });
}

export default function AutomationsView(): ReactNode {
  const [rules, setRules] = useState<AutomationRuleSummary[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAutomationsData()
      .then(({ rulesBody, approvalsBody }) => {
        if (cancelled) return;
        setRules(rulesBody.data);
        setTotal(rulesBody.total);
        setApprovals(approvalsBody.data);
        setPendingTotal(approvalsBody.total);
      })
      .catch(() => { if (!cancelled) setError("Failed to load automations"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleGrant = useCallback((id: string) => {
    grantApproval(id).then(reload).catch(() => null);
  }, [reload]);

  const handleDeny = useCallback((id: string) => {
    denyApproval(id).then(reload).catch(() => null);
  }, [reload]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container automations-page">
      <div className="automations-page__header">
        <h1 className="automations-page__title">Automaciones</h1>
        {pendingTotal > 0 && (
          <span className="automations-page__pending-badge">{pendingTotal} pending</span>
        )}
      </div>

      <section className="automations-section">
        <h2 className="automations-section__title">
          Reglas <span className="count">({total})</span>
        </h2>
        {rules.length === 0 ? (
          <p className="page-empty">No hay reglas de automatización aún.</p>
        ) : (
          <ul className="rule-list">
            {rules.map((rule) => (
              <RuleItem key={rule.id} rule={rule} />
            ))}
          </ul>
        )}
      </section>

      <section className="automations-section">
        <h2 className="automations-section__title">
          Aprobaciones pendientes <span className="count">({pendingTotal})</span>
        </h2>
        {approvals.length === 0 ? (
          <p className="page-empty">No hay aprobaciones pendientes.</p>
        ) : (
          <ul className="approval-list">
            {approvals.map((a) => (
              <ApprovalItem
                key={a.id}
                approval={a}
                onGrant={handleGrant}
                onDeny={handleDeny}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
