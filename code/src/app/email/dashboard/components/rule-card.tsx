'use client';

import { useState } from 'react';
import './rule-card.css';

interface RuleCardProps {
  rule: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRuleDeleted: () => void;
}

const MATCH_ICONS: Record<string, string> = {
  SENDER: '👤',
  KEYWORD: '🔑',
  NEWSLETTER: '📧',
  OLD_EMAILS: '📅',
};

const ACTION_ICONS: Record<string, string> = {
  DELETE: '🗑️',
  ARCHIVE: '📦',
  LABEL: '🏷️',
  MOVE_TO_FOLDER: '📁',
};

export default function RuleCard({ rule, isExpanded, onToggleExpand, onRuleDeleted }: RuleCardProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/email/cleanup/${rule.id}/matches`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!confirm('¿Ejecutar esta regla? Esto ' + rule.action.toLowerCase() + 'á los emails que coincidan.'))
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/email/cleanup/${rule.id}/execute`, {
        method: 'POST',
      });

      if (res.ok) {
        const result = await res.json();
        alert(
          `Se ${rule.action === 'DELETE' ? 'eliminaron' : 'archivaron'} ${result.succeeded} emails`
        );
        // Reset preview
        setPreviewData(null);
      }
    } catch (error) {
      console.error('Error executing rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta regla?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/email/cleanup/${rule.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onRuleDeleted();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rule-card ${isExpanded ? 'rule-card--expanded' : ''}`}>
      <button className="rule-card__header" onClick={onToggleExpand}>
        <div className="rule-card__header-content">
          <span className="rule-card__icon">{MATCH_ICONS[rule.matchType] || '📧'}</span>
          <div className="rule-card__title-group">
            <h4 className="rule-card__title">{rule.name}</h4>
            <p className="rule-card__type">
              {rule.matchType} → {rule.action}
            </p>
          </div>
        </div>
        <span className="rule-card__chevron">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="rule-card__expanded">
          <div className="rule-card__actions">
            <button
              className="rule-card__action-btn rule-card__action-btn--primary"
              onClick={handlePreview}
              disabled={previewLoading}
            >
              {previewLoading ? '⏳ Cargando...' : '👁️ Vista Previa'}
            </button>
            <button
              className="rule-card__action-btn rule-card__action-btn--danger"
              onClick={handleExecute}
              disabled={loading || !previewData}
            >
              {loading ? '⏳ Ejecutando...' : `${ACTION_ICONS[rule.action]} Ejecutar`}
            </button>
            <button
              className="rule-card__action-btn rule-card__action-btn--secondary"
              onClick={handleDelete}
              disabled={loading}
            >
              ✕ Eliminar
            </button>
          </div>

          {previewData && (
            <div className="rule-card__preview">
              <h5 className="rule-card__preview-title">
                Vista previa: {previewData.totalMatches} emails encontrados
              </h5>
              {previewData.totalMatches === 0 ? (
                <p className="rule-card__preview-empty">No hay emails que coincidan con esta regla</p>
              ) : (
                <div className="rule-card__preview-list">
                  {previewData.matches.slice(0, 5).map((match: any, idx: number) => (
                    <div key={idx} className="rule-card__preview-item">
                      <div className="rule-card__preview-item-sender">{match.senderEmail}</div>
                      <div className="rule-card__preview-item-title">{match.title}</div>
                      <div className="rule-card__preview-item-date">
                        {new Date(match.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {previewData.totalMatches > 5 && (
                    <div className="rule-card__preview-more">
                      ... y {previewData.totalMatches - 5} más
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {rule.matchedCount > 0 && (
            <div className="rule-card__stats">
              <p className="rule-card__stat">
                <strong>{rule.matchedCount}</strong> emails encontrados
              </p>
              <p className="rule-card__stat">
                <strong>{rule.executedCount}</strong> acciones ejecutadas
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
