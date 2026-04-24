"use client";

import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { ConfirmDeleteModalProps } from "./utils/types";
import "./confirm-delete-modal.css";

const ConfirmDeleteModal = ({
  isOpen,
  itemName,
  onConfirm,
  onCancel,
  deleting = false,
}: ConfirmDeleteModalProps): ReactNode  => {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); };
  }, [handleKey, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cdm-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="cdm" onClick={(e) => e.stopPropagation()}>
        <span className="material-symbols-outlined cdm__icon">delete_forever</span>
        <h2 className="cdm__title">¿Eliminar este elemento?</h2>
        <p className="cdm__message">
          Vas a eliminar <span className="cdm__item-name">&ldquo;{itemName}&rdquo;</span>.
          Esta acción no se puede deshacer.
        </p>
        <div className="cdm__actions">
          <button className="cdm__btn cdm__btn--cancel" type="button" onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button className="cdm__btn cdm__btn--delete" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
