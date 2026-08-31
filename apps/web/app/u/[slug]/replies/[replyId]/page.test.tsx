import { useParams } from "next/navigation";
import { render, screen } from "../../../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedItemDto } from "../../../../lib/requests/api";
import ReplyDetailPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeItem(overrides: Partial<FeedItemDto> = {}): FeedItemDto {
  return {
    request: {
      id: "request-2",
      body: "오늘도 무사히 지나갔어요.",
      createdAt: "2026-08-20T10:15:00.000Z",
      replyCount: 2,
      authorSlot: 0,
      author: { anonymous: true },
    },
    replies: [
      {
        id: "reply-other",
        requestId: "request-2",
        body: "저도 응원할게요.",
        createdAt: "2026-08-21T11:00:00.000Z",
        authorSlot: 1,
        author: { anonymous: true },
      },
      {
        id: "reply-1",
        requestId: "request-2",
        body: "잘 하셨어요.",
        createdAt: "2026-08-21T11:30:00.000Z",
        authorSlot: 2,
        author: { anonymous: false, nickname: "민들레", nicknameDiscriminator: "D59D" },
      },
    ],
    ...overrides,
  };
}

function installFakeBackend({
  item,
  status = 200,
}: {
  item?: FeedItemDto;
  status?: number;
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }

      if (url.includes("/replies/")) {
        if (status >= 400) {
          return Promise.resolve(jsonResponse(status, { statusCode: status }));
        }
        return Promise.resolve(jsonResponse(200, item));
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ReplyDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an invalid-address message for a malformed slug", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "no-discriminator-here",
      replyId: "reply-1",
    });
    installFakeBackend({});

    render(<ReplyDetailPage />);

    expect(
      await screen.findByText("잘못된 프로필 주소입니다."),
    ).toBeInTheDocument();
  });

  it("renders the full parent thread and highlights only the navigated-to reply", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "민들레-D59D",
      replyId: "reply-1",
    });
    installFakeBackend({ item: makeItem() });

    render(<ReplyDetailPage />);

    expect(
      await screen.findByText("오늘도 무사히 지나갔어요."),
    ).toBeInTheDocument();
    const otherReply = screen.getByText("저도 응원할게요.");
    const highlightedReply = screen.getByText("잘 하셨어요.");
    expect(otherReply.closest("article")).not.toHaveClass("ring-primary");
    expect(highlightedReply.closest("article")).toHaveClass("ring-primary");
    expect(
      screen.getByRole("link", { name: "← 남긴 답변" }),
    ).toHaveAttribute("href", "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/replies");
  });

  it("shows a not-found message when the reply isn't this owner's own revealed reply", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "민들레-D59D",
      replyId: "reply-1",
    });
    installFakeBackend({ status: 404 });

    render(<ReplyDetailPage />);

    expect(
      await screen.findByText("존재하지 않거나 비공개로 설정된 답변입니다."),
    ).toBeInTheDocument();
  });
});
