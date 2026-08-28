import { useParams } from "next/navigation";
import { render, screen } from "../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  profile,
  profileStatus = 200,
}: {
  profile?: unknown;
  profileStatus?: number;
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }

      if (url.includes("/users/")) {
        if (profileStatus >= 400) {
          return Promise.resolve(
            jsonResponse(profileStatus, { statusCode: profileStatus }),
          );
        }
        return Promise.resolve(jsonResponse(200, profile));
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ProfilePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an invalid-address message for a malformed slug", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "no-discriminator-here" });
    installFakeBackend({});

    render(<ProfilePage />);

    expect(
      await screen.findByText("잘못된 프로필 주소입니다."),
    ).toBeInTheDocument();
  });

  it("shows a not-found message when no profile matches", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({ profileStatus: 404 });

    render(<ProfilePage />);

    expect(
      await screen.findByText("존재하지 않는 프로필입니다."),
    ).toBeInTheDocument();
  });

  it("renders the nickname, revealed requests, and revealed replies", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requests: [
          {
            id: "request-1",
            body: "요즘 마음이 자꾸 가라앉아요.",
            createdAt: "2026-08-20T10:15:00.000Z",
          },
        ],
        replies: [
          {
            id: "reply-1",
            body: "잘 하셨어요.",
            createdAt: "2026-08-21T11:30:00.000Z",
            requestId: "request-2",
            requestBody: "오늘도 무사히 지나갔어요.",
          },
        ],
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByText("D59D", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("요즘 마음이 자꾸 가라앉아요.")).toBeInTheDocument();
    expect(screen.getByText("잘 하셨어요.")).toBeInTheDocument();
    expect(
      screen.getByText('"오늘도 무사히 지나갔어요."에 남긴 답변'),
    ).toBeInTheDocument();
  });

  it("shows empty-state text for a profile with nothing revealed", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requests: [],
        replies: [],
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByText("공개한 고민이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("공개한 답변이 없습니다.")).toBeInTheDocument();
  });
});
