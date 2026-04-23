'use client';

import { useState, useEffect } from 'react';
import CleanupRulesList from './cleanup-rules-list';
import CreateCleanupForm from './create-cleanup-form';
import './email-cleanup-panel.css';

export default function EmailCleanupPanel() {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/email/cleanup');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleRuleCreated = async () => {
    setShowForm(false);
    await fetchRules();
  };

  const handleRuleDeleted = async () => {
    await fetchRules();
  };

  return (
    <div className="email-cleanup-panel">
      <div className="email-cleanup-panel__header">
        <div>
          <h2 className="email-cleanup-panel__title">Limpieza de Correo</h2>
          <p className="email-cleanup-panel__description">
            Crea reglas para eliminar o archivar correo automáticamente. Siempre con vista previa antes de ejecutar.
          </p>
        </div>
        <button
          className="email-cleanup-panel__create-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '+ Nueva Regla'}
        </button>
      </div>

      {showForm && (
        <CreateCleanupForm
          onRuleCreated={handleRuleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="page-empty">Cargando reglas...</div>
      ) : rules.length === 0 ? (
        <div className="page-empty">
          No tienes reglas de limpieza. Crea una para empezar a organizar tu correo automáticamente.
        </div>
      ) : (
        <CleanupRulesList rules={rules} onRuleDeleted={handleRuleDeleted} />
      )}
    </div>
  );
}
