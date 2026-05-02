"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ConfirmDeleteModal, useToast } from "@/components/ui";
import { useFormSubmit } from "@/hooks";
import type { ProjectSummary } from "@/modules/projects";

const ProjectNoteSection = ({ projectId, notes, onUpdated }: { projectId: string; notes: Array<{ id: string; body: string; createdAt: Date }>; onUpdated: () => void }): ReactNode => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [newNote, setNewNote] = useState("");

  const handleAdd = useCallback(async () => {
    if (!newNote.trim()) return;
    const res = await fetch(`/projects/api/${projectId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote.trim() }),
    });
    if (res.ok) { setNewNote(""); onUpdated(); }
    else showToast(t("app.common.error"), "error");
  }, [newNote, projectId, onUpdated, showToast, t]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    const res = await fetch(`/projects/api/${projectId}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) onUpdated();
  }, [projectId, onUpdated]);

  return (
    <div className="project-notes">
      <div className="idea-form__row">
        <textarea className="idea-form__input idea-form__input--flex" rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t("app.projects.notePlaceholder")} />
        <button className="idea-form__btn idea-form__btn--save" onClick={() => void handleAdd()}>➕</button>
      </div>
      {notes.map((note) => (
        <div key={note.id} className="project-note">
          <p className="project-note__body">{note.body}</p>
          <div className="project-note__meta">
            <span>{new Date(note.createdAt).toLocaleDateString("es-ES")}</span>
            <button className="idea-item__btn-delete" onClick={() => void handleDeleteNote(note.id)}><span className="material-symbols-outlined">delete</span></button>
          </div>
        </div>
      ))}
    </div>
  );
};

const CreateForm = ({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }): ReactNode => {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.projects.toast.created")),
    onError: (msg) => showToast(msg, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("app.projects.error.requiredName")); return; }
    void submit(async () => {
      const res = await fetch("/projects/api", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), description: description.trim() || undefined,
          startedAt: startedAt || undefined, dueAt: dueAt || undefined,
          tags: tags ? tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error(t("app.projects.error.create"));
      setName(""); setDescription(""); setTags(""); setStartedAt(""); setDueAt("");
      onCreated();
    });
  }, [name, description, tags, startedAt, dueAt, setError, submit, t, onCreated]);

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <input className="idea-form__input" type="text" placeholder={t("app.projects.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <textarea className="idea-form__textarea" placeholder={t("app.projects.descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" placeholder={t("app.projects.tagsPlaceholder")} value={tags} onChange={(e) => setTags(e.target.value)} />
        <input className="idea-form__input idea-form__input--date" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
        <input className="idea-form__input idea-form__input--date" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.projects.action.create")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

const EditForm = ({ project, onSaved, onCancel }: { project: ProjectSummary; onSaved: () => void; onCancel: () => void }): ReactNode => {
  const t = useTranslations();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status);
  const [tags, setTags] = useState(project.tags.join(", "));
  const [startedAt, setStartedAt] = useState(project.startedAt ? new Date(project.startedAt).toISOString().slice(0, 10) : "");
  const [dueAt, setDueAt] = useState(project.dueAt ? new Date(project.dueAt).toISOString().slice(0, 10) : "");
  const { showToast } = useToast();
  const { saving, error, setError, submit } = useFormSubmit({
    onSuccess: () => showToast(t("app.common.savedChanges")),
    onError: (msg) => showToast(msg, "error"),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("app.projects.error.requiredName")); return; }
    void submit(async () => {
      const res = await fetch(`/projects/api/${project.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), description: description.trim() || undefined, status,
          tags: tags ? tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
          startedAt: startedAt || undefined, dueAt: dueAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(t("app.projects.error.save"));
      onSaved();
    });
  }, [name, description, status, tags, startedAt, dueAt, project.id, setError, submit, t, onSaved]);

  return (
    <form className="idea-form idea-form--edit" onSubmit={handleSubmit}>
      <input className="idea-form__input" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <textarea className="idea-form__textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--flex" type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className="idea-form__select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ACTIVE">{t("app.projects.status.active")}</option>
          <option value="PAUSED">{t("app.projects.status.paused")}</option>
          <option value="COMPLETED">{t("app.projects.status.completed")}</option>
          <option value="ARCHIVED">{t("app.projects.status.archived")}</option>
        </select>
      </div>
      <div className="idea-form__row">
        <input className="idea-form__input idea-form__input--date" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
        <input className="idea-form__input idea-form__input--date" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      {error && <p className="idea-form__error">{error}</p>}
      <div className="idea-form__actions">
        <button className="idea-form__btn idea-form__btn--save" type="submit" disabled={saving}>{saving ? t("app.common.loading") : t("app.projects.action.save")}</button>
        <button className="idea-form__btn idea-form__btn--cancel" type="button" onClick={onCancel}>{t("app.common.cancel")}</button>
      </div>
    </form>
  );
};

function ProjectsView(): ReactNode {
  const t = useTranslations();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Array<{ id: string; body: string; createdAt: Date }>>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/projects/api");
      const body = (await res.json()) as { data: ProjectSummary[] };
      setProjects(body.data);
      setError(null);
    } catch { setError(t("app.projects.error.load")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    let m = true; (async () => {
      try { const r = await fetch("/projects/api"); const b = (await r.json()) as { data: ProjectSummary[] }; if (m) setProjects(b.data); }
      catch { if (m) setError(t("app.projects.error.load")); }
      finally { if (m) setLoading(false); }
    })(); return () => { m = false; };
  }, [t]);

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    try {
      const res = await fetch(`/projects/api/${id}`);
      if (!res.ok) return;
      const body = (await res.json()) as { data: { notes: Array<{ id: string; body: string; createdAt: Date }> } };
      setExpandedId(id);
      setExpandedNotes(body.data.notes);
    } catch { /* silent */ }
  }, [expandedId]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/projects/api/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      showToast(t("app.projects.toast.deleted"));
      void fetchProjects();
    } catch { showToast(t("app.projects.error.delete"), "error"); }
    finally { setDeleting(false); }
  }, [fetchProjects, showToast, t]);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t("app.projects.title")} <span className="count">({projects.length})</span></h1>
        <button className="page-add-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕" : t("app.projects.action.new")}</button>
      </div>
      {showForm && <CreateForm onCreated={() => { setShowForm(false); void fetchProjects(); }} onCancel={() => setShowForm(false)} />}
      {projects.length === 0
        ? <p className="page-empty">{t("app.projects.empty.default")}</p>
        : <ul className="page-list">
            {projects.map((p) => (
              <li key={p.id} className="page-list-item idea-item">
                <ConfirmDeleteModal isOpen={confirmDelete === p.id} itemName={p.name} onConfirm={() => void handleDelete(p.id)} onCancel={() => setConfirmDelete(null)} deleting={deleting} />
                <div className="idea-item__main">
                  <strong>{p.name}</strong>
                  {p.status !== "ACTIVE" && <span className="page-badge">{t(`app.projects.status.${p.status.toLowerCase()}`)}</span>}
                  {p.tags.length > 0 && <span className="page-tags">{p.tags.join(", ")}</span>}
                </div>
                <button className="idea-item__edit-btn" onClick={() => toggleExpand(p.id)} title={t("app.common.review")}>
                  {expandedId === p.id ? "▲" : "▼"}
                </button>
                <button className="idea-item__btn-delete" onClick={() => setConfirmDelete(p.id)} title={t("app.common.delete")}>
                  <span className="material-symbols-outlined">delete</span>
                </button>
                {expandedId === p.id && (
                  <div className="idea-item__details" style={{ width: "100%", marginTop: "0.5rem" }}>
                    <EditForm project={p} onSaved={() => { setExpandedId(null); void fetchProjects(); }} onCancel={() => setExpandedId(null)} />
                    <ProjectNoteSection projectId={p.id} notes={expandedNotes} onUpdated={() => toggleExpand(p.id)} />
                  </div>
                )}
              </li>
            ))}
          </ul>}
    </div>
  );
}

export default ProjectsView;
