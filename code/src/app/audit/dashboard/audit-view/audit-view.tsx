import { auditService } from "@/lib/audit";
import type { AuditEntry } from "@/lib/audit";
import "./audit-view.css";

const STATUS_LABELS: Record<string, string> = {
  success: "✓ Éxito",
  failure: "✗ Error",
  pending: "⧗ Pendiente",
};

const STATUS_COLORS: Record<string, string> = {
  success: "#166534",
  failure: "#c0392b",
  pending: "#b45309",
};

const ACTOR_ICONS: Record<string, string> = {
  user: "person",
  system: "settings",
  automation: "smart_toy",
  integration: "hub",
};

export default async function AuditView() {
  const result = await auditService.query({ pageSize: 50 });
  const entries = result.entries;

  return (
    <div className="audit-view">
      <header className="audit-view__header">
        <h1 className="audit-view__title">Auditoría</h1>
        <p className="audit-view__subtitle">
          {entries.length} eventos registrados (últimos 50)
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="audit-view__empty">
          <p className="audit-view__empty-title">Sin eventos</p>
          <p className="audit-view__empty-text">
            Los eventos de auditoría aparecerán aquí a medida que uses el sistema.
          </p>
        </div>
      ) : (
        <div className="audit-view__list">
          {entries.map((entry: AuditEntry) => (
            <div key={entry.id} className="audit-entry">
              <div className="audit-entry__icon">
                <span className="material-symbols-outlined">{ACTOR_ICONS[entry.actor] ?? "push_pin"}</span>
              </div>

              <div className="audit-entry__main">
                <div className="audit-entry__header">
                  <h3 className="audit-entry__title">
                    {entry.module}.{entry.action}
                  </h3>
                  <time
                    className="audit-entry__time"
                    dateTime={new Date(entry.createdAt).toISOString()}
                  >
                    {new Date(entry.createdAt).toLocaleString("es-ES")}
                  </time>
                </div>

                <div className="audit-entry__meta">
                  <span className="audit-entry__actor">
                    {entry.actorDetail || entry.actor}
                  </span>

                  {entry.entityType && (
                    <span className="audit-entry__entity">
                      {entry.entityType}
                      {entry.entityId && `: ${entry.entityId.slice(0, 8)}…`}
                    </span>
                  )}

                  <span
                    className="audit-entry__status"
                    style={{ color: STATUS_COLORS[entry.status] }}
                  >
                    {STATUS_LABELS[entry.status]}
                  </span>
                </div>

                {entry.errorMessage && (
                  <p className="audit-entry__error">{entry.errorMessage}</p>
                )}

                {(entry.input || entry.output) && (
                  <details className="audit-entry__details">
                    <summary className="audit-entry__details-summary">
                      Detalles
                    </summary>
                    <div className="audit-entry__details-content">
                      {entry.input && (
                        <div className="audit-entry__detail-section">
                          <h4>Input</h4>
                          <pre>{JSON.stringify(entry.input, null, 2)}</pre>
                        </div>
                      )}
                      {entry.output && (
                        <div className="audit-entry__detail-section">
                          <h4>Output</h4>
                          <pre>{JSON.stringify(entry.output, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
