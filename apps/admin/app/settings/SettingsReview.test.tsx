import { fireEvent, render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsResponseDto } from "shared/dto";
import { SettingsReview } from "./SettingsReview";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeSettings(
  overrides: Partial<SettingsResponseDto> = {},
): SettingsResponseDto {
  return {
    queueFreshnessHours: 60,
    queueReplyCap: 5,
    guestReplyLimit: 5,
    nicknameCooldownDays: 7,
    updatedAt: "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

// Same fake-backend pattern as AdminReview.test.tsx.
function installFakeBackend(
  settings: SettingsResponseDto,
  {
    loggedIn = true,
    isAdmin = true,
    neverResolveSettings = false,
    neverResolveAuth = false,
  }: {
    loggedIn?: boolean;
    isAdmin?: boolean;
    neverResolveSettings?: boolean;
    neverResolveAuth?: boolean;
  } = {},
) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
        if (neverResolveAuth) return new Promise(() => {});
        if (!loggedIn) {
          return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
        }
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "admin@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/admin/settings") && method === "GET") {
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        if (neverResolveSettings) return new Promise(() => {});
        return Promise.resolve(jsonResponse(200, settings));
      }

      if (url.endsWith("/admin/settings") && method === "PATCH") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        Object.assign(settings, body);
        return Promise.resolve(jsonResponse(200, settings));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("SettingsReview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an inline login form when signed out", async () => {
    installFakeBackend(makeSettings(), { loggedIn: false });
    render(<SettingsReview />);

    expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
  });

  it("shows a forbidden message for a logged-in non-admin", async () => {
    installFakeBackend(makeSettings(), { isAdmin: false });
    render(<SettingsReview />);

    expect(
      await screen.findByText("이 계정은 접근 권한이 없어요."),
    ).toBeInTheDocument();
  });

  it("shows the current settings values for an admin", async () => {
    installFakeBackend(
      makeSettings({ queueFreshnessHours: 24, queueReplyCap: 3, guestReplyLimit: 2 }),
    );
    render(<SettingsReview />);

    expect(await screen.findByLabelText("답변 큐 신선도 (시간)")).toHaveValue(24);
    expect(screen.getByLabelText("답변 큐 답장 캡")).toHaveValue(3);
    expect(screen.getByLabelText("비회원 답장 총량 제한")).toHaveValue(2);
  });

  it("keeps the '설정' title visible while auth is still resolving", async () => {
    installFakeBackend(makeSettings(), { neverResolveAuth: true });

    render(<SettingsReview />);

    expect(
      await screen.findByRole("heading", { name: "설정" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("이메일"),
    ).not.toBeInTheDocument();
  });

  it("shows a skeleton, not a blank page, while settings are loading", async () => {
    installFakeBackend(makeSettings(), { neverResolveSettings: true });
    const { container } = render(<SettingsReview />);

    // "설정" itself renders immediately regardless of status (outside
    // AdminStatusGate), so it can't be the wait condition — wait for this
    // field's label instead, which only appears once auth resolves and
    // SettingsFormSkeleton (not AdminStatusGate's own generic skeleton)
    // takes over. Auth resolves (AdminStatusGate's own loading clears) but
    // the settings GET never does — this is specifically that in-between
    // window, where the real heading and this field's label/hint text stay
    // put and only the actual value (needing the GET to resolve) is a
    // skeleton.
    expect(
      await screen.findByText("답변 큐 신선도 (시간)"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "설정" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "이 시간이 지난 온설은 답변 큐/보관함에서 제외됩니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("답변 큐 신선도 (시간)"),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("saves edited values and shows a confirmation", async () => {
    installFakeBackend(makeSettings());
    render(<SettingsReview />);

    const input = await screen.findByLabelText("답변 큐 신선도 (시간)");
    fireEvent.change(input, { target: { value: "48" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("저장했어요.")).toBeInTheDocument();
  });

  it("shows the nav with a link back to 신고 검토", async () => {
    installFakeBackend(makeSettings());
    render(<SettingsReview />);

    await screen.findByLabelText("답변 큐 신선도 (시간)");
    expect(screen.getByRole("link", { name: "신고 검토" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("does not show the nav's logout button when signed out", async () => {
    installFakeBackend(makeSettings(), { loggedIn: false });
    render(<SettingsReview />);
    await screen.findByLabelText("이메일");

    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });
});
