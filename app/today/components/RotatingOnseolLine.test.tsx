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
