'use client';

import { useState } from 'react';
import './telegram-setup.css';

interface TelegramSetupProps {
  onSetupComplete: () => void;
}

export default function TelegramSetup({ onSetupComplete }: TelegramSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/telegram/preferences', {
        method: 'POST',
      });

      if (res.ok) {
        setRegistered(true);
        setTimeout(() => {
          onSetupComplete();
        }, 1500);
      } else {
        setError('Error al registrar Telegram. Intenta de nuevo.');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="telegram-setup">
      <div className="telegram-setup__card">
        <div className="telegram-setup__icon">🤖</div>
        <h2 className="telegram-setup__title">Activa Alertas por Telegram</h2>
        <p className="telegram-setup__description">
          Recibe notificaciones instantáneas en Telegram cuando ocurran eventos importantes en tu correo.
          Nunca te perderás un email importante.
        </p>

        <div className="telegram-setup__features">
          <div className="telegram-setup__feature">
            <span className="telegram-setup__feature-icon">👤</span>
            <span>Alertas de contactos importantes</span>
          </div>
          <div className="telegram-setup__feature">
            <span className="telegram-setup__feature-icon">🔑</span>
            <span>Notificaciones por palabras clave</span>
          </div>
          <div className="telegram-setup__feature">
            <span className="telegram-setup__feature-icon">💰</span>
            <span>Alertas de facturas sin pagar</span>
          </div>
          <div className="telegram-setup__feature">
            <span className="telegram-setup__feature-icon">📅</span>
            <span>Resúmenes diarios o semanales</span>
          </div>
        </div>

        {error && <div className="telegram-setup__error">{error}</div>}

        {registered && (
          <div className="telegram-setup__success">
            ✓ ¡Registrado exitosamente! Redireccionando...
          </div>
        )}

        <button
          className="telegram-setup__button"
          onClick={handleRegister}
          disabled={loading || registered}
        >
          {loading ? 'Registrando...' : registered ? '✓ Completado' : 'Registrarse en Telegram'}
        </button>

        <p className="telegram-setup__note">
          Después de registrarte, necesitarás conectar tu cuenta de Telegram.
          Recibirás instrucciones en el siguiente paso.
        </p>
      </div>
    </div>
  );
}
