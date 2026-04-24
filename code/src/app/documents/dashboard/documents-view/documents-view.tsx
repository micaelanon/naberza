"use client";

const PAGE_SIZE = 10;

import { useEffect, useState } from "react";
import { Pagination } from "@/components/ui";
import type { ReactNode } from "react";
import type { DocumentSummary } from "@/modules/documents";

const DocumentsView = (): ReactNode  => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  const paginatedDocuments = documents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <h1>Documents <span className="count">({total})</span></h1>
      {documents.length === 0 ? (
        <p className="page-empty">No documents yet. Sync from Paperless-ngx to populate.</p>
      ) : (
        <ul className="document-list">
          {paginatedDocuments.map((doc) => (
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
      <Pagination currentPage={page} totalItems={documents.length} pageSize={PAGE_SIZE} itemLabel="documentos" onPageChange={setPage} />
    </div>
  );
}

export default DocumentsView;
