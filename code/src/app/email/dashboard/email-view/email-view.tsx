'use client';

import { useState, useEffect } from 'react';
import TelegramAlertsPanel from '../components/telegram-alerts-panel';
import EmailCleanupPanel from '../components/email-cleanup-panel';
import './email-view.css';

type Tab = 'alerts' | 'cleanup';

export default function EmailDashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('cleanup');
  const [preference, setPreference] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has Telegram preference
    fetchPreference();
  }, []);

  const fetchPreference = async () => {
    try {
      const res = await fetch('/api/notifications/telegram/preferences');
      if (res.ok) {
        const data = await res.json();
        setPreference(data);
      }
    } catch (error) {
      console.error('Error fetching preference:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-dashboard">
      <div className="email-dashboard__header">
        <h1 className="email-dashboard__title">Gestión de Correo</h1>
        <p className="email-dashboard__subtitle">
          Automatiza tu correo con alertas, limpieza inteligente y organización
        </p>
      </div>

      <div className="email-dashboard__tabs">
        <button
          className={`email-dashboard__tab ${activeTab === 'cleanup' ? 'email-dashboard__tab--active' : ''}`}
          onClick={() => setActiveTab('cleanup')}
        >
          <span className="email-dashboard__tab-icon">🧹</span>
          Limpieza de Correo
        </button>
        <button
          className={`email-dashboard__tab ${activeTab === 'alerts' ? 'email-dashboard__tab--active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="email-dashboard__tab-icon">🔔</span>
          Alertas Telegram
        </button>
      </div>

      <div className="email-dashboard__content">
        {activeTab === 'cleanup' && <EmailCleanupPanel />}
        {activeTab === 'alerts' && (
          <TelegramAlertsPanel
            preference={preference}
            onPreferenceUpdate={fetchPreference}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
