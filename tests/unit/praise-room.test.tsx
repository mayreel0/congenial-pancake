// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/socket-client", () => ({
  createPostSocket: () => ({
    on: vi.fn(),
    disconnect: vi.fn()
  })
}));

import PraiseRoom from "@/components/PraiseRoom";

describe("PraiseRoom", () => {
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

    expect(screen.getByText("익명")).toBeInTheDocument();
    expect(screen.queryByText("비밀닉네임")).not.toBeInTheDocument();
  });
});
