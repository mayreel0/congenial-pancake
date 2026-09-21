import { afterEach, describe, expect, it, vi } from "vitest";
import { PopoverDialog } from "ui/PopoverDialog";
import { fireEvent, render, screen, waitFor } from "../../lib/test-utils";

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubWidth(mobile: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: mobile && query === "(max-width: 639.98px)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  }

  it("is a labelled dialog with its content while open", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "달력" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "안쪽 버튼" })).toBeInTheDocument();
  });

  it("is modal to assistive tech only at dialog width, not as an anchored popover", () => {
    stubWidth(true);
    const { unmount } = render(
      <PopoverDialog label="달력" open popoverClassName="" onClose={vi.fn()}>
        <p>내용</p>
      </PopoverDialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    unmount();

    stubWidth(false);
    render(
      <PopoverDialog label="달력" open popoverClassName="" onClose={vi.fn()}>
        <p>내용</p>
      </PopoverDialog>,
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
  });

  it("is hidden from assistive tech while its leave animation plays, then removed", async () => {
    const { rerender } = render(
      <PopoverDialog label="달력" open popoverClassName="" onClose={vi.fn()}>
        <p>내용</p>
      </PopoverDialog>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <PopoverDialog label="달력" open={false} popoverClassName="" onClose={vi.fn()}>
        <p>내용</p>
      </PopoverDialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const leaving = screen.getByLabelText("달력", { selector: "[aria-hidden=true]" });
    expect(leaving).toBeInTheDocument();
    // Neither layer may swallow taps meant for what opens next.
    expect(leaving).toHaveClass("pointer-events-none");
    expect(leaving.parentElement).toHaveClass("pointer-events-none");
    await waitFor(() =>
      expect(screen.queryByLabelText("달력")).not.toBeInTheDocument(),
    );
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
