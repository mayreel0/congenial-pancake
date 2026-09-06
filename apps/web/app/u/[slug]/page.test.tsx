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
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: true,
        requestCount: 1,
        replyCount: 1,
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
    expect(
      screen.getByRole("heading", { name: "남긴 고민 (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "남긴 답변 (1)" }),
    ).toBeInTheDocument();
    // Section titles link out to the full paginated "모두 보기" list —
    // built from the canonical nickname/discriminator the API returned,
    // not the raw (possibly differently-cased) URL param.
    expect(screen.getByRole("link", { name: "남긴 고민 (1)" })).toHaveAttribute(
      "href",
      "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/requests",
    );
    expect(screen.getByRole("link", { name: "남긴 답변 (1)" })).toHaveAttribute(
      "href",
      "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/replies",
    );
  });

  it("does not link a hidden section's title", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requestsVisible: false,
        repliesVisible: true,
        countsVisible: true,
        requestCount: 3,
        replyCount: 0,
        requests: [],
        replies: [],
      },
    });

    render(<ProfilePage />);

    expect(
      await screen.findByText("이 계정은 남긴 고민을 비공개로 설정했어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "남긴 고민 (3)" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "남긴 답변 (0)" }),
    ).toBeInTheDocument();
  });

  it("shows empty-state text for a profile with nothing revealed", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: true,
        requestCount: 0,
        replyCount: 0,
        requests: [],
        replies: [],
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByText("공개한 고민이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("공개한 답변이 없습니다.")).toBeInTheDocument();
  });

  it("shows a privacy message for a hidden list without hiding its count", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requestsVisible: false,
        repliesVisible: true,
        countsVisible: true,
        requestCount: 3,
        replyCount: 0,
        requests: [],
        replies: [],
      },
    });

    render(<ProfilePage />);

    expect(
      await screen.findByText("이 계정은 남긴 고민을 비공개로 설정했어요."),
    ).toBeInTheDocument();
    expect(screen.getByText("공개한 답변이 없습니다.")).toBeInTheDocument();
    // The count still shows in the heading even though the list itself is
    // hidden — countsVisible is independent of requestsVisible.
    expect(
      screen.getByRole("heading", { name: "남긴 고민 (3)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "남긴 답변 (0)" }),
    ).toBeInTheDocument();
  });

  it("omits the count suffix from section headings when counts are off", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      profile: {
        nickname: "민들레",
        nicknameDiscriminator: "D59D",
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: false,
        requestCount: null,
        replyCount: null,
        requests: [],
        replies: [],
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByText("공개한 고민이 없습니다.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "남긴 고민" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "남긴 답변" }),
    ).toBeInTheDocument();
  });
});
