import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RequestComposer } from "./RequestComposer";

describe("RequestComposer", () => {
  it("disables send when the request body is empty", () => {
    render(
      <RequestComposer
        status="idle"
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });

  it("submits through the send button when the request has text", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <RequestComposer
        status="idle"
        value="오늘은 조금 지쳤어요."
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows pending and success states", () => {
    const { rerender } = render(
      <RequestComposer
        status="pending"
        value="오늘은 조금 지쳤어요."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "남기는 중" })).toBeDisabled();

    rerender(
      <RequestComposer
        status="success"
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("남겨졌어요")).toBeInTheDocument();
  });
});
