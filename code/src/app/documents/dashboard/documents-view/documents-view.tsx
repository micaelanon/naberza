"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DocumentSummary } from "@/modules/documents";

export default function DocumentsView(): ReactNode {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/documents/api")
      .then((res) => res.json())
      .then((body: { data: DocumentSummary[]; total: number }) => {
        setDocuments(body.data);
        setTotal(body.total);
      })
      .catch(() => setError("Failed to load documents"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="page-error">{error}</p>;

  return (
    <div className="page-container">
      <h1>Documents <span className="count">({total})</span></h1>
      {documents.length === 0 ? (
        <p className="page-empty">No documents yet. Sync from Paperless-ngx to populate.</p>
      ) : (
        <ul className="document-list">
          {documents.map((doc) => (
            <li key={doc.id} className="document-item">
              <span className="document-item__title">{doc.title}</span>
              <span className="document-item__type">{doc.documentType}</span>
              {doc.correspondent && (
                <span className="document-item__correspondent">{doc.correspondent}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
