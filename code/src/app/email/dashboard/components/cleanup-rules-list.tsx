'use client';

import { useState } from 'react';
import RuleCard from './rule-card';
import './cleanup-rules-list.css';

interface CleanupRulesListProps {
  rules: any[];
  onRuleDeleted: () => void;
}

export default function CleanupRulesList({ rules, onRuleDeleted }: CleanupRulesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const enabledRules = rules.filter((r) => r.enabled);
  const disabledRules = rules.filter((r) => !r.enabled);

  return (
    <div className="cleanup-rules-list">
      {enabledRules.length > 0 && (
        <div className="cleanup-rules-list__section">
          <h3 className="cleanup-rules-list__section-title">
            Reglas Activas ({enabledRules.length})
          </h3>
          <div className="cleanup-rules-list__grid">
            {enabledRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isExpanded={expandedId === rule.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === rule.id ? null : rule.id)
                }
                onRuleDeleted={onRuleDeleted}
              />
            ))}
          </div>
        </div>
      )}

      {disabledRules.length > 0 && (
        <div className="cleanup-rules-list__section">
          <h3 className="cleanup-rules-list__section-title">
            Reglas Desactivadas ({disabledRules.length})
          </h3>
          <div className="cleanup-rules-list__grid">
            {disabledRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isExpanded={expandedId === rule.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === rule.id ? null : rule.id)
                }
                onRuleDeleted={onRuleDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
