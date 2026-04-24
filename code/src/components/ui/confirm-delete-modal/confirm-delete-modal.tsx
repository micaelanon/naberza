"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";

import { KEYBOARD_KEYS } from "@/lib/constants";

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
  const t = useTranslations();

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === KEYBOARD_KEYS.ESCAPE) onCancel();
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
        <h2 className="cdm__title">{t("app.common.delete")}</h2>
        <p className="cdm__message">
          {itemName ? <span className="cdm__item-name">&ldquo;{itemName}&rdquo;</span> : null}.
          {t("app.delete.modal.subtitle")}
        </p>
        <div className="cdm__actions">
          <button className="cdm__btn cdm__btn--cancel" type="button" onClick={onCancel} disabled={deleting}>
            {t("app.common.cancel")}
          </button>
          <button className="cdm__btn cdm__btn--delete" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? t("app.common.deleting") : t("app.common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
