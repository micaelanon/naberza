"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AutomationRuleSummary, ApprovalRequestSummary } from "@/modules/automations";

export default function AutomationsView(): ReactNode {
  const [rules, setRules] = useState<AutomationRuleSummary[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/automations/api/rules").then((r) => r.json()),
      fetch("/automations/api/approvals?status=PENDING").then((r) => r.json()),
    ])
      .then(([rulesBody, approvalsBody]: [
        { data: AutomationRuleSummary[]; total: number },
        { data: ApprovalRequestSummary[]; total: number },
      ]) => {
        setRules(rulesBody.data);
        setApprovals(approvalsBody.data);
      })
      .catch(() => setError("Failed to load automations"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Automations</h1>

      <h2>Rules <span className="count">({rules.length})</span></h2>
      {rules.length === 0 ? (
        <p className="page-empty">No automation rules yet.</p>
      ) : (
        <ul className="automation-list">
          {rules.map((rule) => (
            <li key={rule.id} className="automation-item">
              <span className="automation-item__name">{rule.name}</span>
              <span className={`automation-item__status automation-item__status--${rule.enabled ? "active" : "inactive"}`}>
                {rule.enabled ? "active" : "disabled"}
              </span>
              <span className="automation-item__trigger">{rule.triggerEvent}</span>
              <span className="automation-item__stats">{rule.executionCount} runs</span>
            </li>
          ))}
        </ul>
      )}

      <h2>Pending Approvals <span className="count">({approvals.length})</span></h2>
      {approvals.length === 0 ? (
        <p className="page-empty">No pending approvals.</p>
      ) : (
        <ul className="approval-list">
          {approvals.map((a) => (
            <li key={a.id} className="approval-item">
              <span className="approval-item__rule">{a.automationRuleId}</span>
              <span className="approval-item__status">{a.status}</span>
              <span className="approval-item__actions">{a.proposedActions.length} actions</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
