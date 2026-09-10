import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "ui/Button";

describe("Button pending state", () => {
  it("keeps the same accessible name while pending — no text swap", () => {
    render(<Button pending={false}>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();

    render(<Button pending={true}>저장</Button>);
    // Two renders exist now (not a rerender) — getAllByRole to disambiguate.
    const pendingButton = screen.getAllByRole("button", { name: "저장" })[1];
    expect(pendingButton).toBeInTheDocument();
  });

  it("disables the button while pending, even without an explicit disabled prop", () => {
    render(<Button pending>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("stays disabled while pending even if the caller also passes disabled=false", () => {
    render(
      <Button disabled={false} pending>
        저장
      </Button>,
    );
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("respects a caller's own disabled prop when not pending", () => {
    render(<Button disabled>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("is not disabled when neither pending nor disabled is set", () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled();
  });

  it("marks the button aria-busy while pending", () => {
    render(<Button pending>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("keeps the resting size class applied while pending (no resize)", () => {
    render(<Button pending>저장</Button>);
    const button = screen.getByRole("button", { name: "저장" });
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("px-4");
  });

  it("still fires onClick handlers when not pending", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    screen.getByRole("button", { name: "저장" }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
