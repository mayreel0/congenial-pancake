import { useParams } from "next/navigation";
import { render, screen } from "../../../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedItemDto } from "../../../../lib/requests/api";
import RequestDetailPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeItem(overrides: Partial<FeedItemDto> = {}): FeedItemDto {
  return {
    request: {
      id: "request-1",
      body: "요즘 마음이 자꾸 가라앉아요.",
      createdAt: "2026-08-20T10:15:00.000Z",
      replyCount: 1,
      authorSlot: 0,
      author: { anonymous: false, nickname: "민들레", nicknameDiscriminator: "D59D" },
    },
    replies: [
      {
        id: "reply-1",
        requestId: "request-1",
        body: "잘 하셨어요.",
        createdAt: "2026-08-21T11:30:00.000Z",
        authorSlot: 1,
        author: { anonymous: true },
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

      if (url.includes("/requests/")) {
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

describe("RequestDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an invalid-address message for a malformed slug", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "no-discriminator-here",
      requestId: "request-1",
    });
    installFakeBackend({});

    render(<RequestDetailPage />);

    expect(
      await screen.findByText("잘못된 프로필 주소입니다."),
    ).toBeInTheDocument();
  });

  it("renders the full thread with no report/save actions", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "민들레-D59D",
      requestId: "request-1",
    });
    installFakeBackend({ item: makeItem() });

    render(<RequestDetailPage />);

    expect(
      await screen.findByText("요즘 마음이 자꾸 가라앉아요."),
    ).toBeInTheDocument();
    expect(screen.getByText("잘 하셨어요.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /마음에 남기기/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← 남긴 고민" }),
    ).toHaveAttribute("href", "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/requests");
  });

  it("shows a not-found message when the request isn't this owner's own revealed post", async () => {
    vi.mocked(useParams).mockReturnValue({
      slug: "민들레-D59D",
      requestId: "request-1",
    });
    installFakeBackend({ status: 404 });

    render(<RequestDetailPage />);

    expect(
      await screen.findByText("존재하지 않거나 비공개로 설정된 글입니다."),
    ).toBeInTheDocument();
  });
});
