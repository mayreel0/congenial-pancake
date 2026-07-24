// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const praisePostCount = vi.hoisted(() => vi.fn());
const praiseCommentCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: userFindUniqueOrThrow },
    praisePost: { count: praisePostCount },
    praiseComment: { count: praiseCommentCount }
  }
}));

import MyActivityPage from "@/app/me/page";

describe("MyActivityPage", () => {
  beforeEach(() => {
    auth.mockReset();
    userFindUniqueOrThrow.mockReset();
    praisePostCount.mockReset();
    praiseCommentCount.mockReset();
    auth.mockResolvedValue({ user: { id: "user_1" } });
    praisePostCount.mockResolvedValue(0);
    praiseCommentCount.mockResolvedValue(0);
  });

  it("explains write restrictions for shadow banned users", async () => {
    userFindUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      trustScore: 25,
      sanctionState: "SHADOW_BANNED",
      posts: [],
      comments: []
    });

    const page = await MyActivityPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("계정 상태: 그림자 제한")).toBeInTheDocument();
    expect(screen.getByText(/글쓰기, 칭찬 댓글, 답글, 감사 반응, 신고 작성이 제한됩니다/)).toBeInTheDocument();
  });

  it("shows low trust as a warning without write restriction copy", async () => {
    userFindUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      trustScore: 55,
      sanctionState: "LOW_TRUST",
      posts: [],
      comments: []
    });

    const page = await MyActivityPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("계정 상태: 주의 필요")).toBeInTheDocument();
    expect(screen.queryByText(/글쓰기, 칭찬 댓글, 답글, 감사 반응, 신고 작성이 제한됩니다/)).not.toBeInTheDocument();
  });
});
