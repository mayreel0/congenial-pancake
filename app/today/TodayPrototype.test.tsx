import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TodayPrototype } from "./TodayPrototype";

describe("TodayPrototype", () => {
  afterEach(() => {
    window.localStorage.clear();
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
});
