// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComfortMain from "@/components/ComfortMain";

describe("ComfortMain", () => {
  it("shows today's request status and action choices", () => {
    render(
      <ComfortMain
        hasRequestedToday={false}
        recentExamples={[]}
        answerableRequests={[]}
        isAuthenticated={true}
      />
    );

    expect(screen.getByText("오늘은 아직 위로 요청을 남기지 않았어요.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "위로 요청하기" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "다른 사람에게 답변하기" })).toBeInTheDocument();
  });
});
