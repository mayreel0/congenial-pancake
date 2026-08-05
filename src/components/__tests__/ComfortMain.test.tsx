// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComfortMain from "@/components/ComfortMain";
import ComfortReplyPanel from "@/components/ComfortReplyPanel";
import ComfortRequestForm from "@/components/ComfortRequestForm";
import RecentComfortExamples from "@/components/RecentComfortExamples";

const fetchMock = vi.hoisted(() => vi.fn());

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("ComfortMain", () => {
  it("switches between request and reply modes with ordinary buttons", () => {
    render(
      <ComfortMain
        hasRequestedToday={false}
        recentExamples={[]}
        answerableRequests={[]}
        isAuthenticated={true}
      />
    );

    expect(screen.getByText("오늘은 아직 위로 요청을 남기지 않았어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "위로 요청하기" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다른 사람에게 답변하기" }));

    expect(screen.getByRole("region", { name: "다른 사람에게 답변하기" })).toBeInTheDocument();
  });

  it("explains whether the request form needs login or is limited for today", () => {
    const { rerender } = render(
      <ComfortMain
        hasRequestedToday={false}
        recentExamples={[]}
        answerableRequests={[]}
        isAuthenticated={false}
      />
    );

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.getByText("후 하루에 한 번 위로 요청을 남길 수 있어요.")).toBeInTheDocument();

    rerender(
      <ComfortMain
        hasRequestedToday
        recentExamples={[]}
        answerableRequests={[]}
        isAuthenticated
      />
    );

    expect(screen.getByText("오늘은 이미 위로 요청을 남겼어요. 내일 다시 남길 수 있어요.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });

  it("recovers the request form after a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<ComfortRequestForm hasRequestedToday={false} isAuthenticated />);

    fireEvent.change(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), { target: { value: "오늘은 조금 힘들어요." } });
    fireEvent.submit(screen.getByRole("button", { name: "위로 요청 남기기" }).closest("form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("위로 요청을 남기지 못했습니다. 다시 시도해주세요."));
    expect(screen.getByRole("button", { name: "위로 요청 남기기" })).toBeEnabled();
  });

  it("recovers the reply form after a network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<ComfortReplyPanel isAuthenticated requests={[{ id: "request_1", body: "힘든 하루였어요.", replyCount: 0 }]} />);

    fireEvent.change(screen.getByLabelText("힘든 하루였어요."), { target: { value: "정말 수고했어요." } });
    fireEvent.submit(screen.getByRole("button", { name: "답변 남기기" }).closest("form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("답변을 남기지 못했습니다. 다시 시도해주세요."));
    expect(screen.getByRole("button", { name: "답변 남기기" })).toBeEnabled();
  });

  it("truncates previews and renders at most two replies per recent request", () => {
    const requestBody = "가".repeat(181);
    const replyBody = "나".repeat(141);
    render(
      <RecentComfortExamples
        examples={[{
          id: "request_1",
          body: requestBody,
          replies: [
            { id: "reply_1", body: replyBody },
            { id: "reply_2", body: "두 번째 답변" },
            { id: "reply_3", body: "세 번째 답변" }
          ]
        }]}
      />
    );

    expect(screen.getByText(`${"가".repeat(160)}...`)).toBeInTheDocument();
    expect(screen.getByText(`${"나".repeat(120)}...`)).toBeInTheDocument();
    const replies = within(screen.getByLabelText("남겨진 답변"));
    expect(replies.getAllByText(/./)).toHaveLength(2);
    expect(replies.queryByText("세 번째 답변")).not.toBeInTheDocument();
  });
});
