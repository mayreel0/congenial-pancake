// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/socket-client", () => ({
  createPostSocket: () => ({
    on: vi.fn(),
    disconnect: vi.fn()
  })
}));

import PraiseRoom from "@/components/PraiseRoom";

describe("PraiseRoom", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not reveal nicknames for anonymous comments", () => {
    render(
      <PraiseRoom
        post={{
          id: "post_1",
          title: "칭찬받고 싶은 일",
          body: "오늘 해냈습니다",
          comments: [
            {
              id: "comment_1",
              body: "정말 잘했어요",
              isAiGenerated: false,
              displayMode: "ANONYMOUS",
              author: { nickname: "비밀닉네임" }
            }
          ]
        }}
      />
    );

    const comment = screen.getByText("정말 잘했어요").closest("article");
    expect(comment).not.toBeNull();
    expect(within(comment as HTMLElement).getByText("익명")).toBeInTheDocument();
    expect(screen.queryByText("비밀닉네임")).not.toBeInTheDocument();
  });

  it("renders a praise comment form", () => {
    render(
      <PraiseRoom
        post={{
          id: "post_1",
          title: "칭찬받고 싶은 일",
          body: "오늘 해냈습니다",
          comments: []
        }}
      />
    );

    expect(screen.getByLabelText("칭찬 댓글")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "칭찬 남기기" })).toBeInTheDocument();
  });

  it("submits a post report and shows the accepted message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PraiseRoom
        post={{
          id: "post_1",
          title: "칭찬받고 싶은 일",
          body: "오늘 해냈습니다",
          comments: []
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));
    fireEvent.change(screen.getByLabelText("신고 사유"), { target: { value: "불편한 표현이 있어요" } });
    fireEvent.click(screen.getByRole("button", { name: "신고 접수" }));

    await screen.findByText("신고가 접수되었습니다");
    expect(fetchMock).toHaveBeenCalledWith("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "POST",
        targetId: "post_1",
        reason: "불편한 표현이 있어요"
      })
    });
  });

  it("submits a comment report from the selected comment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PraiseRoom
        post={{
          id: "post_1",
          title: "칭찬받고 싶은 일",
          body: "오늘 해냈습니다",
          comments: [
            {
              id: "comment_1",
              body: "정말 잘했어요",
              isAiGenerated: false,
              displayMode: "NICKNAME",
              author: { nickname: "칭찬친구" }
            }
          ]
        }}
      />
    );

    const comment = screen.getByText("정말 잘했어요").closest("article");
    expect(comment).not.toBeNull();
    fireEvent.click(within(comment as HTMLElement).getByRole("button", { name: "신고하기" }));
    fireEvent.change(within(comment as HTMLElement).getByLabelText("신고 사유"), {
      target: { value: "댓글 신고 이유" }
    });
    fireEvent.click(within(comment as HTMLElement).getByRole("button", { name: "신고 접수" }));

    await screen.findByText("신고가 접수되었습니다");
    expect(fetchMock).toHaveBeenCalledWith("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "COMMENT",
        targetId: "comment_1",
        reason: "댓글 신고 이유"
      })
    });
  });
});
