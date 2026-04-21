'use client';

import { useState } from 'react';
import './create-alert-form.css';

interface CreateAlertFormProps {
  onAlertCreated: () => void;
  onCancel: () => void;
}

const TRIGGER_TYPES = [
  {
    id: 'PRIORITY_SENDER',
    label: 'Contactos Importantes',
    description: 'Alerta cuando recibas emails de contactos específicos',
    icon: '👤',
  },
  {
    id: 'KEYWORD',
    label: 'Palabras Clave',
    description: 'Alerta cuando aparezcan ciertas palabras en el asunto o cuerpo',
    icon: '🔑',
  },
  {
    id: 'UNPAID_INVOICE',
    label: 'Facturas sin Pagar',
    description: 'Alerta para recordarte facturas que no has pagado',
    icon: '💰',
  },
  {
    id: 'URGENT_TASK',
    label: 'Tareas Vencidas',
    description: 'Alerta cuando una tarea esté próxima a vencer',
    icon: '⏰',
  },
  {
    id: 'DAILY_DIGEST',
    label: 'Resumen Diario',
    description: 'Recibe un resumen de tu correo cada día',
    icon: '📅',
  },
  {
    id: 'WEEKLY_DIGEST',
    label: 'Resumen Semanal',
    description: 'Recibe un resumen de tu correo cada semana',
    icon: '📋',
  },
];

export default function CreateAlertForm({ onAlertCreated, onCancel }: CreateAlertFormProps) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('PRIORITY_SENDER');
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTrigger = TRIGGER_TYPES.find((t) => t.id === triggerType);

  const handleConfigChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name,
        triggerType,
        config,
      };

      if (triggerType === 'PRIORITY_SENDER' && !config.senderEmails?.length) {
        setError('Especifica al menos un email de contacto importante');
        setLoading(false);
        return;
      }

      if (triggerType === 'KEYWORD' && !config.keywords?.length) {
        setError('Especifica al menos una palabra clave');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/notifications/telegram/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onAlertCreated();
      } else {
        setError('Error al crear la alerta. Intenta de nuevo.');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-alert-form" onSubmit={handleSubmit}>
      <div className="create-alert-form__section">
        <label className="create-alert-form__label">Nombre de la alerta</label>
        <input
          type="text"
          className="create-alert-form__input"
          placeholder="ej: Alertas del jefe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="create-alert-form__section">
        <label className="create-alert-form__label">Tipo de Alerta</label>
        <div className="create-alert-form__trigger-types">
          {TRIGGER_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`create-alert-form__trigger-type ${
                triggerType === type.id ? 'create-alert-form__trigger-type--active' : ''
              }`}
              onClick={() => {
                setTriggerType(type.id);
                setConfig({});
              }}
            >
              <span className="create-alert-form__trigger-icon">{type.icon}</span>
              <span className="create-alert-form__trigger-label">{type.label}</span>
            </button>
          ))}
        </div>
        {selectedTrigger && (
          <p className="create-alert-form__trigger-description">{selectedTrigger.description}</p>
        )}
      </div>

      {/* PRIORITY_SENDER Config */}
      {triggerType === 'PRIORITY_SENDER' && (
        <div className="create-alert-form__section">
          <label className="create-alert-form__label">Emails de Contactos Importantes</label>
          <textarea
            className="create-alert-form__textarea"
            placeholder="Escribe los emails separados por comas&#10;ej: boss@example.com, ceo@example.com"
            onChange={(e) =>
              handleConfigChange(
                'senderEmails',
                e.target.value.split(',').map((s) => s.trim())
              )
            }
          />
        </div>
      )}

      {/* KEYWORD Config */}
      {triggerType === 'KEYWORD' && (
        <div className="create-alert-form__section">
          <label className="create-alert-form__label">Palabras Clave</label>
          <textarea
            className="create-alert-form__textarea"
            placeholder="Escribe las palabras clave separadas por comas&#10;ej: factura, pago, urgente"
            onChange={(e) =>
              handleConfigChange(
                'keywords',
                e.target.value.split(',').map((s) => s.trim())
              )
            }
          />
          <label className="create-alert-form__label">Buscar en:</label>
          <select
            className="create-alert-form__select"
            onChange={(e) => handleConfigChange('searchIn', e.target.value)}
            defaultValue="both"
          >
            <option value="subject">Solo asunto</option>
            <option value="body">Solo cuerpo</option>
            <option value="both">Asunto y cuerpo</option>
          </select>
        </div>
      )}

      {error && <div className="create-alert-form__error">{error}</div>}

      <div className="create-alert-form__actions">
        <button type="submit" className="create-alert-form__submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Alerta'}
        </button>
        <button type="button" className="create-alert-form__cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
