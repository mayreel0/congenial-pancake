import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { Toast } from "ui/Toast";

function touch(clientX: number, clientY = 100, identifier = 1) {
  return { clientX, clientY, identifier };
}

function swipe(target: Element, x: number, y = 0) {
  fireEvent.touchStart(target, { touches: [touch(150)] });
  fireEvent.touchMove(target, { touches: [touch(150 + x, 100 + y)] });
  fireEvent.touchEnd(target, {
    touches: [], changedTouches: [touch(150 + x, 100 + y)],
  });
}

describe("mobile toast", () => {
  let mobile = true;
  beforeEach(() => {
    mobile = true;
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup() {
    const dismiss = vi.fn();
    const view = render(<Toast toast={{ kind: "success", message: "온설을 남겼어요" }} onDismiss={dismiss} />);
    return { ...view, dismiss, card: screen.getByRole("status") };
  }

  it.each([-100, -80, 80, 100])("dismisses a %ipx horizontal swipe", (x) => {
    const { dismiss, card } = setup();
    swipe(card, x);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it.each([-45, 45])("follows the finger by %ipx and snaps back below the threshold", (x) => {
    const { dismiss, card } = setup();
    fireEvent.touchStart(card, { touches: [touch(150)] });
    fireEvent.touchMove(card, { touches: [touch(150 + x)] });
    expect(card.style.transform).toBe(`translateX(${x}px)`);
    expect(card.style.transition).toBe("none");
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(150 + x)] });
    expect(card.style.transform).toBe("");
    expect(card.style.transition).toBe("");
    expect(dismiss).not.toHaveBeenCalled();
  });

  it.each(["cancel", "scroll", "resize", "multitouch"])("restores the card on %s", (reason) => {
    const { dismiss, card } = setup();
    fireEvent.touchStart(card, { touches: [touch(150)] });
    fireEvent.touchMove(card, { touches: [touch(260)] });
    expect(card.style.transform).toBe("translateX(110px)");
    if (reason === "cancel") fireEvent.touchCancel(card);
    if (reason === "scroll") fireEvent.scroll(card);
    if (reason === "resize") fireEvent(window, new Event("resize"));
    if (reason === "multitouch") {
      fireEvent.touchStart(card, { touches: [touch(260), touch(270, 100, 2)] });
    }
    expect(card.style.transform).toBe("");
    expect(card.style.transition).toBe("");
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(260)] });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it.each([[0, 0], [79, 0], [5, 100], [100, 100]])("ignores tap/short/vertical gestures (%i,%i)", (x, y) => {
    const { dismiss, card } = setup();
    swipe(card, x, y);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("never turns an initial vertical scroll into dismissal", () => {
    const { dismiss, card } = setup();
    fireEvent.touchStart(card, { touches: [touch(150)] });
    fireEvent.touchMove(card, { touches: [touch(152, 125)] });
    fireEvent.touchMove(card, { touches: [touch(270, 125)] });
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(270, 125)] });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("keeps the close button available without treating its drag as dismissal", () => {
    const { dismiss } = setup();
    const button = screen.getByRole("button", { name: "알림 닫기" });
    swipe(button, 100);
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores cancelled and multi-touch gestures", () => {
    const { dismiss, card } = setup();
    fireEvent.touchStart(card, { touches: [touch(150)] });
    fireEvent.touchMove(card, { touches: [touch(270)] });
    fireEvent.touchCancel(card);
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(270)] });
    fireEvent.touchStart(card, { touches: [touch(150), touch(170, 100, 2)] });
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(270)] });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("preserves desktop touch behavior", () => {
    mobile = false;
    const { dismiss, card } = setup();
    swipe(card, 100);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("ignores a long press before movement", () => {
    const { dismiss, card } = setup();
    const start = createEvent.touchStart(card, { touches: [touch(150)] });
    const move = createEvent.touchMove(card, { touches: [touch(270)] });
    Object.defineProperty(start, "timeStamp", { value: 100 });
    Object.defineProperty(move, "timeStamp", { value: 700 });
    fireEvent(card, start);
    fireEvent(card, move);
    fireEvent.touchEnd(card, { touches: [], changedTouches: [touch(270)] });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("preserves selected text", () => {
    const { dismiss, card } = setup();
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(screen.getByText("온설을 남겼어요"));
    selection.addRange(range);
    try {
      swipe(card, 100);
      expect(dismiss).not.toHaveBeenCalled();
    } finally {
      selection.removeAllRanges();
    }
  });

  it("expires click suppression after a short drag", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const { dismiss, card } = setup();
    swipe(card, 40);
    now.mockReturnValue(1401);
    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }), { detail: 1 });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("does not carry an old gesture into a replacement toast", () => {
    const { dismiss, card, rerender } = setup();
    fireEvent.touchStart(card, { touches: [touch(150)] });
    fireEvent.touchMove(card, { touches: [touch(270)] });
    rerender(<Toast toast={{ kind: "error", message: "새 알림" }} onDismiss={dismiss} />);
    fireEvent.touchEnd(screen.getByRole("status"), { touches: [], changedTouches: [touch(270)] });
    expect(dismiss).not.toHaveBeenCalled();
  });
});
