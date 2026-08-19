import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaveToggleButton } from "./SaveToggleButton";

describe("SaveToggleButton", () => {
  it("shows unsaved state and calls onToggle", () => {
    const onToggle = vi.fn();
    render(<SaveToggleButton saved={false} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: "마음에 남기기" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows saved state", () => {
    render(<SaveToggleButton saved onToggle={() => {}} />);

    expect(
      screen.getByRole("button", { name: /마음에 남긴 온설/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
