import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "../lib/test-utils";
import { AccountRestoreDialog } from "./AccountRestoreDialog";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString();
}

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function meResponse(deletionGracePeriodEndsAt: string | null) {
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
    deletionGracePeriodEndsAt,
  });
}

function installFakeBackend(deletionGracePeriodEndsAt: string | null) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(meResponse(deletionGracePeriodEndsAt));
      }
      if (url.endsWith("/auth/restore-account")) {
        return Promise.resolve(meResponse(null));
      }
      if (url.endsWith("/auth/logout")) {
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AccountRestoreDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing for an account with no pending deletion", async () => {
    const fetchMock = installFakeBackend(null);
    render(<AccountRestoreDialog />);

    // Wait for the /auth/me query to actually resolve before asserting the
    // negative — otherwise this would trivially pass before useAuth() has
    // any data at all.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the days remaining until permanent deletion", async () => {
    installFakeBackend(daysFromNowIso(10));
    render(<AccountRestoreDialog />);

    expect(
      await screen.findByText(/10일 후 완전히 삭제됩니다/),
    ).toBeInTheDocument();
  });

  it("clears the grace period when 복구하기 is clicked", async () => {
    installFakeBackend(daysFromNowIso(10));
    render(<AccountRestoreDialog />);

    fireEvent.click(await screen.findByRole("button", { name: "복구하기" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
