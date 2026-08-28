import { render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  loggedIn,
  nickname = null,
}: {
  loggedIn: boolean;
  nickname?: string | null;
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
            nickname,
            nicknameDiscriminator: "ABCD",
            nicknameChangeAvailableAt: null,
          }),
        );
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("SettingsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the login prompt to anonymous visitors", async () => {
    installFakeBackend({ loggedIn: false });

    render(<SettingsPage />);

    expect(
      await screen.findByText("로그인하면 설정을 볼 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그인" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "http://localhost:3000/login" }),
      ]),
    );
  });

  it("shows the nickname section for a logged-in member without a nickname yet", async () => {
    installFakeBackend({ loggedIn: true, nickname: null });

    render(<SettingsPage />);

    expect(
      await screen.findByText("아직 설정한 닉네임이 없어요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "설정하기" })).toBeInTheDocument();
  });

  it("shows the current nickname when already set", async () => {
    installFakeBackend({ loggedIn: true, nickname: "민들레" });

    render(<SettingsPage />);

    expect(await screen.findByText("민들레")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
  });
});
