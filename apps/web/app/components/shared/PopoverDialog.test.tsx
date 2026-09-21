import { describe, expect, it, vi } from "vitest";
import { PopoverDialog } from "ui/PopoverDialog";
import { fireEvent, render, screen } from "../../lib/test-utils";

function renderDialog(overrides: { open?: boolean; onClose?: () => void } = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  render(
    <PopoverDialog
      label="달력"
      open={overrides.open ?? true}
      popoverClassName="sm:absolute"
      onClose={onClose}
    >
      <button type="button">안쪽 버튼</button>
    </PopoverDialog>,
  );
  return onClose;
}

describe("PopoverDialog", () => {
  it("is a labelled dialog with its content while open", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "달력" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "안쪽 버튼" })).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on a tap on the backdrop, not on a tap inside the box", () => {
    const onClose = renderDialog();

    fireEvent.mouseDown(screen.getByRole("button", { name: "안쪽 버튼" }));
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = renderDialog();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape while closed", () => {
    const onClose = renderDialog({ open: false });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
