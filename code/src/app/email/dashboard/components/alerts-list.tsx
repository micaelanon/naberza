'use client';

import { useState } from 'react';
import './alerts-list.css';

interface AlertsListProps {
  alerts: any[];
  onAlertDeleted: () => void;
}

const TRIGGER_ICONS: Record<string, string> = {
  PRIORITY_SENDER: '👤',
  KEYWORD: '🔑',
  UNPAID_INVOICE: '💰',
  URGENT_TASK: '⏰',
  FINANCE_SUMMARY: '📊',
  DAILY_DIGEST: '📅',
  WEEKLY_DIGEST: '📋',
};

const TRIGGER_LABELS: Record<string, string> = {
  PRIORITY_SENDER: 'Contactos Importantes',
  KEYWORD: 'Palabras Clave',
  UNPAID_INVOICE: 'Facturas sin Pagar',
  URGENT_TASK: 'Tareas Vencidas',
  FINANCE_SUMMARY: 'Resumen Financiero',
  DAILY_DIGEST: 'Resumen Diario',
  WEEKLY_DIGEST: 'Resumen Semanal',
};

export default function AlertsList({ alerts, onAlertDeleted }: AlertsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta alerta?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/notifications/telegram/alerts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onAlertDeleted();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <div key={alert.id} className="alerts-list__item">
          <div className="alerts-list__item-header">
            <div className="alerts-list__item-icon">
              {TRIGGER_ICONS[alert.triggerType] || '🔔'}
            </div>
            <div className="alerts-list__item-info">
              <h3 className="alerts-list__item-title">{alert.name}</h3>
              <p className="alerts-list__item-type">
                {TRIGGER_LABELS[alert.triggerType] || alert.triggerType}
              </p>
            </div>
            <button
              className="alerts-list__item-delete"
              onClick={() => handleDelete(alert.id)}
              disabled={deleting === alert.id}
              title="Eliminar alerta"
            >
              {deleting === alert.id ? '...' : '✕'}
            </button>
          </div>
          {alert.description && (
            <p className="alerts-list__item-description">{alert.description}</p>
          )}
          <div className="alerts-list__item-meta">
            <span className="alerts-list__item-badge">
              {alert.enabled ? '✓ Activa' : '○ Inactiva'}
            </span>
            <span className="alerts-list__item-priority">{alert.priority}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
