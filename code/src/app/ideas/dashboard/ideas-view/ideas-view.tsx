"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { IdeaSummary } from "@/modules/ideas";

export default function IdeasView(): ReactNode {
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/ideas/api")
      .then((res) => res.json())
      .then((body: { data: IdeaSummary[]; total: number }) => {
        setIdeas(body.data);
        setTotal(body.total);
      })
      .catch(() => setError("Failed to load ideas"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Ideas <span className="count">({total})</span></h1>
      {ideas.length === 0 ? (
        <p className="page-empty">No ideas yet.</p>
      ) : (
        <ul className="ideas-list">
          {ideas.map((idea) => (
            <li key={idea.id} className="idea-item">
              <span className="idea-item__title">{idea.title}</span>
              {idea.body && (
                <span className="idea-item__body">{idea.body}</span>
              )}
              {idea.tags.length > 0 && (
                <span className="idea-item__tags">{idea.tags.join(", ")}</span>
              )}
              <span className={`idea-item__status idea-item__status--${idea.status.toLowerCase()}`}>
                {idea.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
