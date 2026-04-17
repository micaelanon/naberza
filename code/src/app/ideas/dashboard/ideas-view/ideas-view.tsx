"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { IdeaSummary } from "@/modules/ideas";

// ─── Create form ──────────────────────────────────────────────────────────────

function IdeaCreateForm({ onCreated, onCancel }: {
  onCreated: () => void;
  onCancel: () => void;
}): ReactNode {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="idea-form" onSubmit={(e) => void handleSubmit(e)}>
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

// ─── List ─────────────────────────────────────────────────────────────────────

function IdeaList({ ideas }: { ideas: IdeaSummary[] }): ReactNode {
  return (
    <ul className="page-list">
      {ideas.map((idea) => (
        <li key={idea.id} className="page-list-item">
          <strong>{idea.title}</strong>
          {idea.status !== "CAPTURED" && <span className="page-badge">{idea.status}</span>}
          {idea.tags.length > 0 && <span className="page-tags">{idea.tags.join(", ")}</span>}
        </li>
      ))}
    </ul>
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

  useEffect(() => { void fetchIdeas(); }, [fetchIdeas]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ideas <span className="count">({total})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : "+ Nueva idea"}</button>
      </div>
      {showForm && <IdeaCreateForm onCreated={() => { setShowForm(false); void fetchIdeas(); }} onCancel={() => setShowForm(false)} />}
      {ideas.length === 0
        ? <p className="page-empty">No hay ideas. Haz clic en &quot;+ Nueva idea&quot; para capturar algo.</p>
        : <IdeaList ideas={ideas} />}
    </div>
  );
}
