import { render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecordsPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  loggedIn,
  replies = [],
}: {
  loggedIn: boolean;
  replies?: unknown[];
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        if (!loggedIn) {
          return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "member@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/replies/mine")) {
        return Promise.resolve(jsonResponse(200, replies));
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RecordsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login prompt to anonymous visitors", async () => {
    installFakeBackend({ loggedIn: false });

    render(<RecordsPage />);

    expect(
      await screen.findByText("로그인하면 내 기록을 볼 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그인" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "http://localhost:3000/login" }),
      ]),
    );
    expect(screen.queryByText("내가 남긴 답변")).not.toBeInTheDocument();
  });

  it("shows an answer CTA when the member has not replied yet", async () => {
    installFakeBackend({ loggedIn: true });

    render(<RecordsPage />);

    expect(await screen.findByText("내가 남긴 답변")).toBeInTheDocument();
    expect(
      await screen.findByText("아직 남긴 답변이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "답변 남기러 가기" })).toHaveAttribute(
      "href",
      "/answer",
    );
  });

  it("renders the member's answer log with request and reply timestamps", async () => {
    installFakeBackend({
      loggedIn: true,
      replies: [
        {
          requestId: "request-1",
          requestBody: "요즘 마음이 자꾸 가라앉아요.",
          requestCreatedAt: "2026-08-20T10:15:00.000Z",
          replyId: "reply-1",
          replyBody: "잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요.",
          replyCreatedAt: "2026-08-21T11:30:00.000Z",
        },
      ],
    });

    render(<RecordsPage />);

    expect(await screen.findByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(
      screen.getByText("잠깐이라도 쉬어가도 괜찮다고 말해주고 싶어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("8월 20일 19:15")).toBeInTheDocument();
    expect(screen.getByText("8월 21일 20:30")).toBeInTheDocument();
  });
});
