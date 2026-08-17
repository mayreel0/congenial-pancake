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
    expect(screen.getByRole("main")).toHaveClass(
      "min-h-[calc(100dvh-3.5rem)]",
    );
    expect(screen.getByTestId("today-entry-layout")).toHaveClass(
      "min-h-[calc(100dvh-8.5rem)]",
      "grid-rows-[1fr_auto_auto]",
    );
    expect(screen.getByTestId("today-entry-copy")).toHaveClass(
      "self-center",
      "sm:self-auto",
    );
    expect(screen.getByTestId("today-entry-composer")).toHaveClass(
      "self-end",
      "sm:self-auto",
    );
  });

  it("renders service navigation on today", () => {
    render(<TodayPrototype />);

    expect(screen.getByRole("link", { name: "온설" })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByRole("link", { name: "남기기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("does not render the old all-in-one dashboard sections", () => {
    render(<TodayPrototype />);

    expect(screen.queryByText("답변을 기다리는 말")).not.toBeInTheDocument();
    expect(screen.queryByText("선택한 요청")).not.toBeInTheDocument();
  });

  it("enables send when mobile input events update the request", () => {
    render(<TodayPrototype />);

    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");
    fireEvent.input(textarea, {
      target: { value: "모바일에서 입력한 온설입니다." },
    });

    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
  });

  it("keeps send enabled while mobile IME composition is still active", () => {
    render(<TodayPrototype />);

    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");
    fireEvent.compositionStart(textarea);
    fireEvent.input(textarea, {
      target: { value: "힘" },
    });

    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
  });

  it("shows a temporary toast after a request is submitted", async () => {
    vi.useFakeTimers();

    render(<TodayPrototype />);

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(screen.getByRole("status")).toHaveTextContent("온설을 남겼어요");
    expect(
      screen.getByRole("button", { name: "알림 닫기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("남겨졌어요")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lets the success toast be dismissed immediately", async () => {
    vi.useFakeTimers();

    render(<TodayPrototype />);

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
