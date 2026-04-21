'use client';

import { useState } from 'react';
import './create-cleanup-form.css';

interface CreateCleanupFormProps {
  onRuleCreated: () => void;
  onCancel: () => void;
}

const MATCH_TYPES = [
  {
    id: 'SENDER',
    label: 'Por Remitente',
    description: 'Elimina emails de remitentes específicos',
    icon: '👤',
  },
  {
    id: 'KEYWORD',
    label: 'Por Palabras Clave',
    description: 'Elimina emails que contengan ciertas palabras',
    icon: '🔑',
  },
  {
    id: 'NEWSLETTER',
    label: 'Boletines',
    description: 'Detecta y elimina boletines automáticamente',
    icon: '📧',
  },
  {
    id: 'OLD_EMAILS',
    label: 'Emails Antiguos',
    description: 'Elimina emails más antiguos que N días',
    icon: '📅',
  },
];

const ACTIONS = [
  { id: 'DELETE', label: 'Eliminar', icon: '🗑️' },
  { id: 'ARCHIVE', label: 'Archivar', icon: '📦' },
];

export default function CreateCleanupForm({ onRuleCreated, onCancel }: CreateCleanupFormProps) {
  const [name, setName] = useState('');
  const [matchType, setMatchType] = useState('NEWSLETTER');
  const [action, setAction] = useState('DELETE');
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMatch = MATCH_TYPES.find((t) => t.id === matchType);

  const handleConfigChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        setError('El nombre de la regla es requerido');
        setLoading(false);
        return;
      }

      const payload = {
        name,
        matchType,
        action,
        config,
      };

      const res = await fetch('/api/email/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onRuleCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear la regla');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-cleanup-form" onSubmit={handleSubmit}>
      <div className="create-cleanup-form__section">
        <label className="create-cleanup-form__label">Nombre de la regla</label>
        <input
          type="text"
          className="create-cleanup-form__input"
          placeholder="ej: Eliminar boletines viejos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="create-cleanup-form__row">
        <div className="create-cleanup-form__section">
          <label className="create-cleanup-form__label">Criterio de Búsqueda</label>
          <div className="create-cleanup-form__match-types">
            {MATCH_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`create-cleanup-form__match-type ${
                  matchType === type.id ? 'create-cleanup-form__match-type--active' : ''
                }`}
                onClick={() => {
                  setMatchType(type.id);
                  setConfig({});
                }}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
          {selectedMatch && (
            <p className="create-cleanup-form__match-description">{selectedMatch.description}</p>
          )}
        </div>

        <div className="create-cleanup-form__section">
          <label className="create-cleanup-form__label">Acción</label>
          <div className="create-cleanup-form__actions">
            {ACTIONS.map((act) => (
              <button
                key={act.id}
                type="button"
                className={`create-cleanup-form__action ${
                  action === act.id ? 'create-cleanup-form__action--active' : ''
                }`}
                onClick={() => setAction(act.id)}
              >
                <span>{act.icon}</span>
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SENDER Config */}
      {matchType === 'SENDER' && (
        <div className="create-cleanup-form__section">
          <label className="create-cleanup-form__label">Emails de Remitentes</label>
          <textarea
            className="create-cleanup-form__textarea"
            placeholder="Escribe los emails separados por comas&#10;ej: spam@example.com, ads@example.com"
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
      {matchType === 'KEYWORD' && (
        <div className="create-cleanup-form__section">
          <label className="create-cleanup-form__label">Palabras Clave</label>
          <textarea
            className="create-cleanup-form__textarea"
            placeholder="Escribe las palabras separadas por comas&#10;ej: promoción, descuento, oferta"
            onChange={(e) =>
              handleConfigChange(
                'keywords',
                e.target.value.split(',').map((s) => s.trim())
              )
            }
          />
          <label className="create-cleanup-form__label">Buscar en:</label>
          <select
            className="create-cleanup-form__select"
            onChange={(e) => handleConfigChange('searchIn', e.target.value)}
            defaultValue="both"
          >
            <option value="subject">Solo asunto</option>
            <option value="body">Solo cuerpo</option>
            <option value="both">Asunto y cuerpo</option>
          </select>
        </div>
      )}

      {/* OLD_EMAILS Config */}
      {matchType === 'OLD_EMAILS' && (
        <div className="create-cleanup-form__section">
          <label className="create-cleanup-form__label">Eliminar emails más antiguos de (días)</label>
          <input
            type="number"
            className="create-cleanup-form__input"
            placeholder="ej: 90"
            min="1"
            max="3650"
            onChange={(e) => handleConfigChange('ageInDays', parseInt(e.target.value))}
          />
          <p className="create-cleanup-form__hint">
            Por ejemplo, 90 eliminará todos los emails de más de 3 meses.
          </p>
        </div>
      )}

      {error && <div className="create-cleanup-form__error">{error}</div>}

      <div className="create-cleanup-form__actions-footer">
        <button type="submit" className="create-cleanup-form__submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Regla'}
        </button>
        <button type="button" className="create-cleanup-form__cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
