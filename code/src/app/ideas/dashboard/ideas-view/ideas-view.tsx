"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { IdeaSummary } from "@/modules/ideas";
import type { IdeaStatus } from "@/modules/ideas/ideas.types";
import { useFormSubmit } from "@/hooks";
import { ConfirmDeleteModal } from "@/components/ui";

// ─── Create form ──────────────────────────────────────────────────────────────

function IdeaCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const { saving, error, setError, submit } = useFormSubmit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch("/ideas/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error("Error al crear la idea");
      setTitle(""); setBody(""); setTags("");
      onCreated();
    });
  };

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <input className="idea-form__input" type="text" placeholder="¿Qué se te ocurre?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="idea-form__textarea" placeholder="Describe la idea (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <input className="idea-form__input" type="text" placeholder="Etiquetas (separadas por coma)" value={tags} onChange={(e) => setTags(e.target.value)} />
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Capturar idea"}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function IdeaEditForm({ idea, onSaved, onCancel }: { idea: IdeaSummary; onSaved: () => void; onCancel: () => void }): ReactNode {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body ?? "");
  const [tags, setTags] = useState(idea.tags.join(", "));
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const { saving, error, setError, submit } = useFormSubmit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    void submit(async () => {
      const res = await fetch(`/ideas/api/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          status,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(b?.error ?? "Error al guardar");
      }
      onSaved();
    });
  };

  return (
    <form className="idea-form idea-form--edit" onSubmit={handleSubmit}>
      <input className="idea-form__input" type="text" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <textarea className="idea-form__textarea" placeholder="Descripción (opcional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="idea-form__row">
        <input className="idea-form__input" type="text" placeholder="Etiquetas (separadas por coma)" value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className="idea-form__select" value={status} onChange={(e) => setStatus(e.target.value as IdeaStatus)}>
          <option value="CAPTURED">Capturada</option>
          <option value="REVIEWING">En revisión</option>
          <option value="PROMOTED">Promovida</option>
          <option value="ARCHIVED">Archivada</option>
        </select>
      </div>
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function IdeaListItem({ idea, onEdited, onDeleted }: { idea: IdeaSummary; onEdited: () => void; onDeleted: () => void }): ReactNode {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/ideas/api/${idea.id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    onDeleted();
  };

  if (editing) {
    return (
      <li className="idea-item idea-item--editing">
        <IdeaEditForm idea={idea} onSaved={() => { setEditing(false); onEdited(); }} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="page-list-item idea-item">
      <ConfirmDeleteModal isOpen={confirmDelete} itemName={idea.title} onConfirm={() => void handleDelete()} onCancel={() => setConfirmDelete(false)} deleting={deleting} />
      <div className="idea-item__main">
        <strong>{idea.title}</strong>
        {idea.status !== "CAPTURED" && <span className="page-badge">{idea.status}</span>}
        {idea.tags.length > 0 && <span className="page-tags">{idea.tags.join(", ")}</span>}
      </div>
      <button className="idea-item__btn-delete" onClick={() => setConfirmDelete(true)} title="Eliminar"><span className="material-symbols-outlined">delete</span></button>
      <button className="idea-item__edit-btn" onClick={() => setEditing(true)} title="Editar">✎</button>
    </li>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function IdeasView(): ReactNode {
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/ideas/api");
      const body = (await res.json()) as { data: IdeaSummary[]; total: number };
      setIdeas(body.data);
      setTotal(body.total);
    } catch {
      setError("Error al cargar ideas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchIdeas() // eslint-disable-line react-hooks/set-state-in-effect
      .catch(() => { /* handled inside fetchIdeas */ })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [fetchIdeas]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ideas <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nueva idea"}</button>
      </div>
      {showForm && (
        <IdeaCreateForm
          onCreated={() => { setShowForm(false); void fetchIdeas(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {ideas.length === 0
        ? <p className="page-empty">No hay ideas. Haz clic en &quot;+ Nueva idea&quot; para capturar algo.</p>
        : (
          <ul className="page-list">
            {ideas.map((idea) => (
              <IdeaListItem key={idea.id} idea={idea} onEdited={() => void fetchIdeas()} onDeleted={() => void fetchIdeas()} />
            ))}
          </ul>
        )
      }
    </div>
  );
}
