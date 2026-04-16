import type { TaskItem } from "@/lib/tasks";

import type { CreateTaskPanelProps } from "./utils/types";

const CreateTaskPanel = ({ form, submitError, isSubmitting, onChange, onSubmit, onCancel }: CreateTaskPanelProps) => (
  <section className="dashboard-page__create-panel">
    <div className="dashboard-page__section-header">
      <span className="dashboard-page__section-kicker">Nueva tarea</span>
      <div className="dashboard-page__section-line" />
    </div>

    <form className="dashboard-page__create-form" onSubmit={onSubmit}>
      <div className="dashboard-page__form-grid">
        <label className="dashboard-page__field dashboard-page__field--full">
          <span className="dashboard-page__field-label">Título</span>
          <input
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            className="dashboard-page__input"
            type="text"
            placeholder="Ej. Llamar al taller"
            required
          />
        </label>

        <label className="dashboard-page__field dashboard-page__field--full">
          <span className="dashboard-page__field-label">Nota</span>
          <textarea
            value={form.note}
            onChange={(e) => onChange("note", e.target.value)}
            className="dashboard-page__textarea"
            rows={3}
            placeholder="Contexto breve para no perder el hilo"
          />
        </label>

        <label className="dashboard-page__field">
          <span className="dashboard-page__field-label">Prioridad</span>
          <select
            value={form.priority}
            onChange={(e) => onChange("priority", e.target.value as TaskItem["priority"])}
            className="dashboard-page__select"
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>

        <label className="dashboard-page__field">
          <span className="dashboard-page__field-label">Tipo</span>
          <select
            value={form.kind}
            onChange={(e) => onChange("kind", e.target.value as TaskItem["kind"])}
            className="dashboard-page__select"
          >
            <option value="normal">Normal</option>
            <option value="persistent">Persistente</option>
          </select>
        </label>

        <label className="dashboard-page__field">
          <span className="dashboard-page__field-label">Canal</span>
          <select
            value={form.channel}
            onChange={(e) => onChange("channel", e.target.value as TaskItem["channel"])}
            className="dashboard-page__select"
          >
            <option value="dashboard">Dashboard</option>
            <option value="telegram">Telegram</option>
          </select>
        </label>

        <label className="dashboard-page__field">
          <span className="dashboard-page__field-label">Etiqueta de fecha</span>
          <input
            value={form.dueLabel}
            onChange={(e) => onChange("dueLabel", e.target.value)}
            className="dashboard-page__input"
            type="text"
            placeholder="Ej. Mañana · 09:00"
          />
        </label>
      </div>

      {submitError && <p className="dashboard-page__form-error">{submitError}</p>}

      <div className="dashboard-page__form-actions">
        <button className="dashboard-page__secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="dashboard-page__primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Crear tarea"}
        </button>
      </div>
    </form>
  </section>
);

export default CreateTaskPanel;
