import { fireEvent, render, screen, waitFor, within } from "./lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminReplyListItemDto } from "shared/dto";
import type { PaginatedDto } from "shared/pagination";
import { mockRouterReplace } from "../vitest.setup";
import { AdminReplies } from "./AdminReplies";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makePage(
  items: AdminReplyListItemDto[],
): PaginatedDto<AdminReplyListItemDto> {
  return { items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 };
}

function makeItem(
  overrides: Partial<AdminReplyListItemDto> = {},
): AdminReplyListItemDto {
  return {
    id: "reply-1",
    requestId: "req-1",
    requestBody: "오늘 조금 힘들었어요.",
    body: "저도 그런 적 있어요.",
    createdAt: "2026-08-25T00:00:00.000Z",
    status: "visible",
    reportCount: 0,
    moderation: null,
    ...overrides,
  };
}

function installFakeBackend(
  page: PaginatedDto<AdminReplyListItemDto>,
  { isAdmin = true }: { isAdmin?: boolean } = {},
) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "user-1",
            email: "admin@example.com",
            createdAt: "2026-08-22T00:00:00.000Z",
          }),
        );
      }

      if (url.endsWith("/admin/whoami")) {
        if (!isAdmin) {
          return Promise.resolve(
            jsonResponse(403, { code: "FORBIDDEN", message: "Forbidden" }),
          );
        }
        return Promise.resolve(jsonResponse(200, { isAdmin: true }));
      }

      if (url.includes("/admin/replies") && method === "GET") {
        return Promise.resolve(jsonResponse(200, page));
      }

      const restoreMatch = /\/admin\/replies\/([^/]+)\/restore$/.exec(url);
      if (restoreMatch && method === "POST") {
        return Promise.resolve(jsonResponse(204, undefined));
      }

      const deleteMatch = /\/admin\/replies\/([^/]+)\/delete$/.exec(url);
      if (deleteMatch && method === "POST") {
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AdminReplies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to / for a logged-in non-admin", async () => {
    installFakeBackend(makePage([]), { isAdmin: false });
    render(<AdminReplies />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
  });

  it("lists replies with their parent request and status", async () => {
    installFakeBackend(makePage([makeItem({ status: "hidden", reportCount: 2 })]));
    render(<AdminReplies />);

    expect(await screen.findByText("저도 그런 적 있어요.")).toBeInTheDocument();
    expect(screen.getByText("오늘 조금 힘들었어요.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "숨김" })).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
  });

  it("shows the moderation verdict, reason, and suggestions when present", async () => {
    installFakeBackend(
      makePage([
        makeItem({
          moderation: {
            action: "suggest_rewrite",
            categories: ["mockery"],
            severity: 2,
            confidence: 0.8,
            reason: "비꼬는 말투가 섞여 있어요.",
            suggestions: ["조금 더 부드럽게 표현해보세요."],
            createdAt: "2026-08-25T00:05:00.000Z",
          },
        }),
      ]),
    );
    render(<AdminReplies />);

    const bodyCell = await screen.findByText("저도 그런 적 있어요.");
    const row = within(bodyCell.closest("tr")!);
    expect(row.getByText("순화 제안")).toBeInTheDocument();
    expect(row.getByText("비꼬는 말투가 섞여 있어요.")).toBeInTheDocument();
    expect(
      row.getByText("대체 제안: 조금 더 부드럽게 표현해보세요."),
    ).toBeInTheDocument();
  });

  it("shows '미검토' when no moderation log exists", async () => {
    installFakeBackend(makePage([makeItem({ moderation: null })]));
    render(<AdminReplies />);

    expect(await screen.findByText("미검토")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    installFakeBackend(makePage([]));
    render(<AdminReplies />);

    expect(
      await screen.findByText("조건에 맞는 답변이 없어요."),
    ).toBeInTheDocument();
  });

  it("sends an action filter as a query param", async () => {
    const fetchMock = installFakeBackend(makePage([makeItem()]));
    render(<AdminReplies />);
    await screen.findByText("저도 그런 적 있어요.");
    fetchMock.mockClear();

    fireEvent.change(screen.getByLabelText("AI 검토"), {
      target: { value: "block" },
    });

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("action=block"),
        ),
      ).toBe(true),
    );
  });

  it("restores a reply", async () => {
    installFakeBackend(makePage([makeItem()]));
    render(<AdminReplies />);
    await screen.findByText("저도 그런 적 있어요.");

    fireEvent.click(screen.getByRole("button", { name: "복구" }));

    await waitFor(() =>
      expect(screen.getByText("복구했어요.")).toBeInTheDocument(),
    );
  });

  it("requires confirmation before permanently deleting a reply", async () => {
    installFakeBackend(makePage([makeItem()]));
    render(<AdminReplies />);
    await screen.findByText("저도 그런 적 있어요.");

    fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));
    expect(
      screen.getByText("영구 삭제할까요? 되돌릴 수 없어요."),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "영구 삭제",
      }),
    );

    await waitFor(() =>
      expect(screen.getByText("영구 삭제했어요.")).toBeInTheDocument(),
    );
  });
});
