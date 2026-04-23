'use client';

import { useState, useEffect } from 'react';
import TelegramSetup from './telegram-setup';
import AlertsList from './alerts-list';
import CreateAlertForm from './create-alert-form';
import './telegram-alerts-panel.css';

interface TelegramAlertsPanelProps {
  preference: any;
  onPreferenceUpdate: () => void;
  loading: boolean;
}

export default function TelegramAlertsPanel({
  preference,
  onPreferenceUpdate,
  loading,
}: TelegramAlertsPanelProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (preference?.id && preference?.telegramEnabled) {
      fetchAlerts();
    }
  }, [preference?.id]);

  const fetchAlerts = async () => {
    if (!preference?.id) return;
    try {
      const res = await fetch(`/api/notifications/telegram/alerts?enabled=true`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleAlertCreated = async () => {
    setShowForm(false);
    await fetchAlerts();
  };

  const handleAlertDeleted = async () => {
    await fetchAlerts();
  };

  if (loading) {
    return <div className="telegram-alerts__loading">Cargando configuración...</div>;
  }

  if (!preference?.telegramEnabled) {
    return <TelegramSetup onSetupComplete={onPreferenceUpdate} />;
  }

  return (
    <div className="telegram-alerts">
      <div className="telegram-alerts__header">
        <div>
          <h2 className="telegram-alerts__title">Alertas por Telegram</h2>
          <p className="telegram-alerts__description">
            Recibe notificaciones en Telegram cuando ocurran eventos importantes en tu correo
          </p>
        </div>
        <button
          className="telegram-alerts__create-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Alerta'}
        </button>
      </div>

      {showForm && (
        <CreateAlertForm
          onAlertCreated={handleAlertCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {alerts.length === 0 ? (
        <div className="page-empty">
          No tienes alertas configuradas. Crea una para empezar a recibir notificaciones.
        </div>
      ) : (
        <AlertsList alerts={alerts} onAlertDeleted={handleAlertDeleted} />
      )}
    </div>
  );
}
