import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RotatingOnseolLine } from "./RotatingOnseolLine";

describe("RotatingOnseolLine", () => {
  it("renders the first message", () => {
    render(
      <RotatingOnseolLine
        messages={[
          "별일 아닌데 마음이 좀 가라앉았어요.",
          "오늘 실수한 일이 계속 떠올라요.",
        ]}
        paused={false}
      />,
    );

    expect(
      screen.getByText("별일 아닌데 마음이 좀 가라앉았어요."),
    ).toBeInTheDocument();
  });

  it("keeps the rotating line in a stable two-line viewport", () => {
    render(
      <RotatingOnseolLine
        messages={[
          "모바일에서 길어질 수 있는 온설 문구가 들어와도 입력창 위치가 흔들리지 않게 보여줘요.",
        ]}
        paused={false}
      />,
    );

    expect(screen.getByText(/모바일에서 길어질 수 있는/)).toHaveClass(
      "line-clamp-2",
      "min-h-14",
    );
  });

  it("advances messages after the interval", () => {
    vi.useFakeTimers();

    render(
      <RotatingOnseolLine
        intervalMs={5000}
        messages={["첫 번째 온설", "두 번째 온설"]}
        paused={false}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("두 번째 온설")).toBeInTheDocument();
    expect(screen.getByText("두 번째 온설")).toHaveStyle({
      "--onseol-transition-ms": "600ms",
    });

    vi.useRealTimers();
  });

  it("does not advance while paused", () => {
    vi.useFakeTimers();

    render(
      <RotatingOnseolLine
        intervalMs={5000}
        messages={["첫 번째 온설", "두 번째 온설"]}
        paused
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("첫 번째 온설")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
