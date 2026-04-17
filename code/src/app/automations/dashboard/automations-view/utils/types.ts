import type { AutomationRuleSummary, ApprovalRequestSummary } from "@/modules/automations";

export interface AutomationsViewState {
  rules: AutomationRuleSummary[];
  approvals: ApprovalRequestSummary[];
  total: number;
  pendingTotal: number;
}

export interface RuleItemProps {
  rule: AutomationRuleSummary;
}

export interface ApprovalItemProps {
  approval: ApprovalRequestSummary;
  onGrant: (id: string) => void;
  onDeny: (id: string) => void;
}
