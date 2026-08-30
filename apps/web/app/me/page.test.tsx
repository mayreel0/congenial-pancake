import { fireEvent, render, screen, within } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import MePage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  loggedIn,
  nickname = null,
  showRequestsOnProfile = true,
  showRepliesOnProfile = true,
  showCountsOnProfile = true,
  nicknameVisible = true,
}: {
  loggedIn: boolean;
  nickname?: string | null;
  showRequestsOnProfile?: boolean;
  showRepliesOnProfile?: boolean;
  showCountsOnProfile?: boolean;
  nicknameVisible?: boolean;
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
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
            nickname,
            nicknameDiscriminator: "ABCD",
            nicknameChangeAvailableAt: null,
            showRequestsOnProfile,
            showRepliesOnProfile,
            showCountsOnProfile,
            nicknameVisible,
          }),
        );
      }

      if (url.endsWith("/auth/profile-visibility")) {
        const patch = init?.body
          ? (JSON.parse(init.body as string) as Record<string, unknown>)
          : {};
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "member@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
            nickname,
            nicknameDiscriminator: "ABCD",
            nicknameChangeAvailableAt: null,
            showRequestsOnProfile,
            showRepliesOnProfile,
            showCountsOnProfile,
            nicknameVisible,
            ...patch,
          }),
        );
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("MePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login prompt to anonymous visitors", async () => {
    installFakeBackend({ loggedIn: false });

    render(<MePage />);

    expect(
      await screen.findByText("로그인하면 내 정보를 볼 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그인" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "http://localhost:3000/login" }),
      ]),
    );
  });

  it("shows the member's email and joined date", async () => {
    installFakeBackend({ loggedIn: true });

    render(<MePage />);

    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText("2026년 8월 22일 가입")).toBeInTheDocument();
  });

  it("shows the nickname section for a logged-in member without a nickname yet", async () => {
    installFakeBackend({ loggedIn: true, nickname: null });

    render(<MePage />);

    expect(
      await screen.findByText("아직 설정한 닉네임이 없어요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "설정하기" })).toBeInTheDocument();
  });

  it("shows the current nickname when already set", async () => {
    installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    expect(await screen.findByText("민들레")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
  });

  it("shows a nickname-visibility toggle only when a nickname is set", async () => {
    installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    expect(await screen.findByText("민들레")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "닉네임 공개" }),
    ).toBeInTheDocument();
  });

  it("hides the nickname-visibility toggle when there's no nickname yet", async () => {
    installFakeBackend({ loggedIn: true, nickname: null });

    render(<MePage />);

    expect(
      await screen.findByText("아직 설정한 닉네임이 없어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "닉네임 공개" }),
    ).not.toBeInTheDocument();
  });

  it("reflects current settings, including a hidden nickname, in the toggles", async () => {
    installFakeBackend({
      loggedIn: true,
      nickname: "민들레",
      showRequestsOnProfile: false,
      nicknameVisible: false,
    });

    render(<MePage />);

    expect(
      await screen.findByRole("switch", { name: "닉네임 공개" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "내가 남긴 고민 목록 공개" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "내가 남긴 답변 목록 공개" }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "고민/답변 개수 공개" }),
    ).toBeChecked();
  });

  it("toggling a visibility switch doesn't call the API until saved and confirmed", async () => {
    const fetchMock = installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    const requestsToggle = await screen.findByRole("switch", {
      name: "내가 남긴 고민 목록 공개",
    });
    fireEvent.click(requestsToggle);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(requestsToggle).not.toBeChecked();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        (typeof input === "string" ? input : input.toString()).endsWith(
          "/auth/profile-visibility",
        ),
      ),
    ).toBe(false);
  });

  it("confirming the dialog sends the full draft, including nicknameVisible", async () => {
    const fetchMock = installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    const requestsToggle = await screen.findByRole("switch", {
      name: "내가 남긴 고민 목록 공개",
    });
    fireEvent.click(requestsToggle);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await screen.findByRole("switch", { name: "내가 남긴 고민 목록 공개" });
    const patchCall = fetchMock.mock.calls.find(([input]) =>
      (typeof input === "string" ? input : input.toString()).endsWith(
        "/auth/profile-visibility",
      ),
    );
    expect(patchCall).toBeDefined();
    const [, init] = patchCall!;
    expect(JSON.parse(init!.body as string)).toEqual({
      nicknameVisible: true,
      showRequestsOnProfile: false,
      showRepliesOnProfile: true,
      showCountsOnProfile: true,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("canceling the dialog leaves the draft as-is without calling the API", async () => {
    const fetchMock = installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    const requestsToggle = await screen.findByRole("switch", {
      name: "내가 남긴 고민 목록 공개",
    });
    fireEvent.click(requestsToggle);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Dialog cancel only closes the dialog — the unsaved toggle change
    // itself is untouched, unlike the section's own "취소" button.
    expect(requestsToggle).not.toBeChecked();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        (typeof input === "string" ? input : input.toString()).endsWith(
          "/auth/profile-visibility",
        ),
      ),
    ).toBe(false);
  });

  it("canceling via the section's own button reverts the draft without calling the API", async () => {
    const fetchMock = installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    const requestsToggle = await screen.findByRole("switch", {
      name: "내가 남긴 고민 목록 공개",
    });
    fireEvent.click(requestsToggle);
    expect(requestsToggle).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(requestsToggle).toBeChecked();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        (typeof input === "string" ? input : input.toString()).endsWith(
          "/auth/profile-visibility",
        ),
      ),
    ).toBe(false);
  });

  it("disables save/cancel until a visibility change is made", async () => {
    installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<MePage />);

    await screen.findByRole("switch", { name: "내가 남긴 고민 목록 공개" });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  });
});
