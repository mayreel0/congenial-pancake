// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const comfortRequestCount = vi.hoisted(() => vi.fn());
const comfortReplyCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: userFindUniqueOrThrow },
    comfortRequest: { count: comfortRequestCount },
    comfortReply: { count: comfortReplyCount }
  }
}));

import MyActivityPage from "@/app/me/page";

describe("MyActivityPage", () => {
  beforeEach(() => {
    auth.mockReset();
    userFindUniqueOrThrow.mockReset();
    comfortRequestCount.mockReset();
    comfortReplyCount.mockReset();
    auth.mockResolvedValue({ user: { id: "user_1" } });
    comfortRequestCount.mockResolvedValue(0);
    comfortReplyCount.mockResolvedValue(0);
  });

  it("explains write restrictions for shadow banned users", async () => {
    userFindUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      trustScore: 25,
      sanctionState: "SHADOW_BANNED",
      comfortRequests: [],
      comfortReplies: []
    });

    render(await MyActivityPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("계정 상태: 그림자 제한")).toBeInTheDocument();
    expect(screen.getByText(/위로 요청, 답변, 신고 작성이 제한됩니다/)).toBeInTheDocument();
  });

  it("shows low trust as a warning without write restriction copy", async () => {
    userFindUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      trustScore: 55,
      sanctionState: "LOW_TRUST",
      comfortRequests: [],
      comfortReplies: []
    });

    render(await MyActivityPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("계정 상태: 주의 필요")).toBeInTheDocument();
    expect(screen.queryByText(/위로 요청, 답변, 신고 작성이 제한됩니다/)).not.toBeInTheDocument();
  });
});
