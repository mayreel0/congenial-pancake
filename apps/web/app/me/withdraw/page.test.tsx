import { fireEvent, render, screen, within } from "../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import WithdrawPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function meResponse() {
  return jsonResponse(200, {
    id: "user-1",
    email: "member@example.com",
    createdAt: "2026-08-22T00:00:00.000Z",
    nickname: null,
    nicknameDiscriminator: "ABCD",
    nicknameChangeAvailableAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    linkedProviders: [],
    deletionGracePeriodEndsAt: null,
  });
}

function installFakeBackend() {
  let withdrawBody: Record<string, unknown> | null = null;

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) return Promise.resolve(meResponse());

      if (url.endsWith("/auth/withdraw")) {
        withdrawBody = init?.body
          ? (JSON.parse(init.body as string) as Record<string, unknown>)
          : null;
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, getWithdrawBody: () => withdrawBody };
}

describe("WithdrawPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the withdrawal explanation and requires confirmation before submitting", async () => {
    installFakeBackend();
    render(<WithdrawPage />);

    const withdrawButton = await screen.findByRole("button", {
      name: "탈퇴하기",
    });
    fireEvent.click(withdrawButton);

    expect(
      await screen.findByText(
        "정말 탈퇴할까요? 30일 이내에 로그인하면 복구할 수 있어요.",
      ),
    ).toBeInTheDocument();
  });

  it("submits immediate: false by default and shows the grace-period done screen", async () => {
    const backend = installFakeBackend();
    render(<WithdrawPage />);

    fireEvent.click(await screen.findByRole("button", { name: "탈퇴하기" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "탈퇴하기" }),
    );

    expect(await screen.findByText("탈퇴 처리됐어요")).toBeInTheDocument();
    expect(
      screen.getByText(/30일 이내에 다시 로그인하면 계정을 복구할 수 있어요/),
    ).toBeInTheDocument();
    expect(backend.getWithdrawBody()).toEqual({ immediate: false });
  });

  it("submits immediate: true and shows the immediate-deletion done screen when the toggle is on", async () => {
    const backend = installFakeBackend();
    render(<WithdrawPage />);

    fireEvent.click(
      await screen.findByLabelText("유예기간 없이 즉시 영구 삭제 (복구 불가)"),
    );
    fireEvent.click(screen.getByRole("button", { name: "탈퇴하기" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "즉시 삭제" }),
    );

    expect(await screen.findByText("탈퇴 처리됐어요")).toBeInTheDocument();
    expect(screen.getByText("계정이 즉시 삭제됐어요.")).toBeInTheDocument();
    expect(backend.getWithdrawBody()).toEqual({ immediate: true });
  });
});
