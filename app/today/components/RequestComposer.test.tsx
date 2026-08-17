import { fireEvent, render, screen } from "@testing-library/react";
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

  it("enables send from the local input value before parent state catches up", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <RequestComposer
        status="idle"
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "모바일에서 입력한 온설입니다." },
    });

    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(onChange).toHaveBeenCalledWith("모바일에서 입력한 온설입니다.");
    expect(onSubmit).toHaveBeenCalledWith("모바일에서 입력한 온설입니다.");
  });

  it("expands the textarea as the request grows and resets when cleared", () => {
    const { rerender } = render(
      <RequestComposer
        status="idle"
        value="짧은 온설"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 120,
    });

    rerender(
      <RequestComposer
        status="idle"
        value={"길어진 온설\n".repeat(6)}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(textarea).toHaveStyle({ height: "120px" });

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 44,
    });

    rerender(
      <RequestComposer
        status="success"
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(textarea).toHaveStyle({ height: "44px" });
  });

  it("keeps autosize bounded with internal scrolling", () => {
    const { rerender } = render(
      <RequestComposer
        status="idle"
        value="아주 긴 온설"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 360,
    });

    rerender(
      <RequestComposer
        status="idle"
        value={"아주 긴 온설\n".repeat(20)}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(textarea).toHaveStyle({ height: "128px", overflowY: "auto" });
  });

  it("shows pending without adding inline success copy", () => {
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

    expect(screen.queryByText("남겨졌어요")).not.toBeInTheDocument();
    expect(screen.queryByText("온설을 남겼어요")).not.toBeInTheDocument();
  });
});
