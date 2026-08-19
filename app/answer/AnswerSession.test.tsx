import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROTOTYPE_STORAGE_KEYS } from "../today/prototype/storage-keys";
import { AnswerSession } from "./AnswerSession";

function seedRequests(overrides: Array<Record<string, unknown>> = []) {
  const base = [
    {
      id: "req-1",
      body: "오늘 실수한 일이 계속 떠올라요.",
      createdAt: new Date().toISOString(),
      authorId: "other-author-1",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
    {
      id: "req-2",
      body: "끝내긴 했는데 잘한 건지 모르겠어요.",
      createdAt: new Date().toISOString(),
      authorId: "other-author-2",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
    ...overrides,
  ];

  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.requests,
    JSON.stringify(base),
  );
}

async function renderHydrated() {
  render(<AnswerSession />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("AnswerSession", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("shows the first queued request and excludes my own requests", async () => {
    seedRequests([
      {
        id: "req-mine",
        body: "내가 쓴 글",
        createdAt: new Date().toISOString(),
        authorId: "viewer-local",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
    ]);

    render(<AnswerSession />);

    expect(
      await screen.findByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("내가 쓴 글")).not.toBeInTheDocument();
  });

  it("advances the queue after skip is confirmed", async () => {
    vi.useFakeTimers();
    seedRequests();
    await renderHydrated();

    fireEvent.click(screen.getByRole("button", { name: "스킵" }));
    expect(
      screen.getByText(/스킵하면 이 글은 답하기 목록에서 다시 보이지 않습니다/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "스킵하기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(
      screen.getByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
  });

  it("does nothing when skip is cancelled", async () => {
    vi.useFakeTimers();
    seedRequests();
    await renderHydrated();

    fireEvent.click(screen.getByRole("button", { name: "스킵" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
  });

  it("moves a held request into the hold panel and back out when answered", async () => {
    vi.useFakeTimers();
    seedRequests();
    await renderHydrated();

    fireEvent.click(screen.getByRole("button", { name: "보류" }));
    fireEvent.click(screen.getByRole("button", { name: "보류하기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(
      screen.getByRole("button", { name: "보류 중 (1)" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "보류 중 (1)" }));
    const panel = screen.getByLabelText("보류한 온설 목록");
    fireEvent.click(within(panel).getByText(/오늘 실수한 일이 계속 떠올라요/));

    fireEvent.change(screen.getByLabelText("답변 남기기"), {
      target: { value: "짧게 들었다는 말을 전해요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "답변하기" }));

    expect(screen.getByRole("button", { name: "답하는 중" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(
      screen.getByRole("button", { name: "보류 중 (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("짧게 들었다는 말을 전해요.")).toBeInTheDocument();
  });

  it("requires confirmation before a report takes effect", async () => {
    vi.useFakeTimers();
    seedRequests();
    await renderHydrated();

    fireEvent.click(screen.getByRole("button", { name: "신고" }));
    expect(
      screen.getByText(/신고하면 이 글은 답하기 목록에서 사라집니다/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "신고" }));
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(
      screen.queryByText("오늘 실수한 일이 계속 떠올라요."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("끝내긴 했는데 잘한 건지 모르겠어요."),
    ).toBeInTheDocument();
  });
});
