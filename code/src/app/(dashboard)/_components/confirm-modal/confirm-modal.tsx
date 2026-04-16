import type { ConfirmModalProps } from "./utils/types";

const ConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal__overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="confirm-modal__box">
        <h3 className="confirm-modal__title" id="confirm-modal-title">
          {title}
        </h3>
        <p className="confirm-modal__description">{description}</p>
        <div className="confirm-modal__actions">
          <button className="dashboard-page__secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="dashboard-page__primary-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
