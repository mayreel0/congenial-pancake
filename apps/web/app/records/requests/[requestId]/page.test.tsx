import { useParams } from "next/navigation";
import { render, screen } from "../../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedItemDto } from "../../../lib/requests/api";
import RequestDetailPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeItem(overrides: Partial<FeedItemDto> = {}): FeedItemDto {
  return {
    request: {
      id: "request-1",
      body: "오늘 조금 힘들었어요.",
      createdAt: "2026-08-20T10:15:00.000Z",
      replyCount: 1,
      authorSlot: 0,
      author: { anonymous: true },
    },
    replies: [
      {
        id: "reply-1",
        requestId: "request-1",
        body: "괜찮아요, 잘 하고 계세요.",
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
  neverResolve = false,
}: {
  item?: FeedItemDto;
  status?: number;
  neverResolve?: boolean;
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }

      if (url.includes("/requests/mine/")) {
        if (neverResolve) return new Promise(() => {});
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

  it("renders the thread on success", async () => {
    vi.mocked(useParams).mockReturnValue({ requestId: "request-1" });
    installFakeBackend({ item: makeItem() });

    render(<RequestDetailPage />);

    expect(
      await screen.findByText("오늘 조금 힘들었어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("괜찮아요, 잘 하고 계세요.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← 내 기록" }),
    ).toHaveAttribute("href", "/records?tab=requests");
  });

  it("shows a skeleton, not empty content, while the thread is loading", async () => {
    vi.mocked(useParams).mockReturnValue({ requestId: "request-1" });
    installFakeBackend({ neverResolve: true });

    const { container } = render(<RequestDetailPage />);

    await screen.findByRole("link", { name: "← 내 기록" });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows a not-found message when the request isn't this viewer's own", async () => {
    vi.mocked(useParams).mockReturnValue({ requestId: "request-1" });
    installFakeBackend({ status: 404 });

    render(<RequestDetailPage />);

    expect(
      await screen.findByText("존재하지 않는 글입니다."),
    ).toBeInTheDocument();
  });
});
