import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "../confirm-modal";

describe("ConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    title: "¿Descartar cambios?",
    description: "Perderás los cambios no guardados.",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title and description when open", () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText("¿Descartar cambios?")).toBeTruthy();
    expect(screen.getByText("Perderás los cambios no guardados.")).toBeTruthy();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses custom confirmLabel and cancelLabel", () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Sí, descartar"
        cancelLabel="Seguir editando"
      />
    );
    expect(screen.getByText("Sí, descartar")).toBeTruthy();
    expect(screen.getByText("Seguir editando")).toBeTruthy();
  });

  it("has role=dialog and aria-modal", () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
