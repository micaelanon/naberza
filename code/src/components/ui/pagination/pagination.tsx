"use client";

import type { ReactNode } from "react";
import type { PaginationProps } from "./utils/types";
import "./pagination.css";

export function Pagination({ currentPage, totalItems, pageSize, itemLabel = "items", onPageChange }: PaginationProps): ReactNode {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className="pagination">
      <div className="pagination__summary">
        {start}-{end} de {totalItems} {itemLabel}
      </div>
      <div className="pagination__controls">
        <button className="pagination__btn" type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          ← Anterior
        </button>
        <span className="pagination__page">Página {currentPage} / {totalPages}</span>
        <button className="pagination__btn" type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}
