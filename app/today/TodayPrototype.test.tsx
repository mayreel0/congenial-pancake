import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayPrototype } from "./TodayPrototype";

describe("TodayPrototype", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("renders the focused today entry screen", () => {
    render(<TodayPrototype />);

    expect(
      screen.getByRole("heading", { name: "오늘 어떤 말을 듣고 싶나요?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
  });

  it("does not render the old all-in-one dashboard sections", () => {
    render(<TodayPrototype />);

    expect(screen.queryByText("답변을 기다리는 말")).not.toBeInTheDocument();
    expect(screen.queryByText("선택한 요청")).not.toBeInTheDocument();
  });

  it("shows a temporary toast after a request is submitted", async () => {
    vi.useFakeTimers();

    render(<TodayPrototype />);

    fireEvent.change(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(screen.getByRole("status")).toHaveTextContent("온설을 남겼어요");
    expect(screen.queryByText("남겨졌어요")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
