import { fireEvent, render, screen, waitFor, within } from "./lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminRequestListItemDto } from "shared/dto";
import type { PaginatedDto } from "shared/pagination";
import { mockRouterReplace } from "../vitest.setup";
import { AdminRequests } from "./AdminRequests";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makePage(
  items: AdminRequestListItemDto[],
): PaginatedDto<AdminRequestListItemDto> {
  return { items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 };
}

function makeItem(
  overrides: Partial<AdminRequestListItemDto> = {},
): AdminRequestListItemDto {
  return {
    id: "req-1",
    body: "오늘 조금 힘들었어요.",
    createdAt: "2026-08-25T00:00:00.000Z",
    status: "visible",
    replyCount: 2,
    reportCount: 0,
    ...overrides,
  };
}

function installFakeBackend(
  page: PaginatedDto<AdminRequestListItemDto>,
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

      if (url.includes("/admin/requests") && method === "GET") {
        return Promise.resolve(jsonResponse(200, page));
      }

      const restoreMatch = /\/admin\/requests\/([^/]+)\/restore$/.exec(url);
      if (restoreMatch && method === "POST") {
        return Promise.resolve(jsonResponse(204, undefined));
      }

      const deleteMatch = /\/admin\/requests\/([^/]+)\/delete$/.exec(url);
      if (deleteMatch && method === "POST") {
        return Promise.resolve(jsonResponse(204, undefined));
      }

      throw new Error(`Unmocked fetch: ${method} ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("AdminRequests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to / for a logged-in non-admin", async () => {
    installFakeBackend(makePage([]), { isAdmin: false });
    render(<AdminRequests />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith("/"));
  });

  it("lists requests with status/reply/report info", async () => {
    installFakeBackend(makePage([makeItem({ status: "hidden", reportCount: 3 })]));
    render(<AdminRequests />);

    expect(await screen.findByText("오늘 조금 힘들었어요.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "숨김" })).toBeInTheDocument();
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.getByText("3건")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    installFakeBackend(makePage([]));
    render(<AdminRequests />);

    expect(
      await screen.findByText("조건에 맞는 고민이 없어요."),
    ).toBeInTheDocument();
  });

  it("debounces the search input into a q= query param", async () => {
    const fetchMock = installFakeBackend(makePage([makeItem()]));
    render(<AdminRequests />);
    await screen.findByText("오늘 조금 힘들었어요.");
    fetchMock.mockClear();

    fireEvent.change(screen.getByLabelText("검색"), {
      target: { value: "힘들" },
    });

    await waitFor(
      () =>
        expect(
          fetchMock.mock.calls.some((call) =>
            String(call[0]).includes("q=%ED%9E%98%EB%93%A4"),
          ),
        ).toBe(true),
      { timeout: 2000 },
    );
  });

  it("sends a status filter as a query param", async () => {
    const fetchMock = installFakeBackend(makePage([makeItem()]));
    render(<AdminRequests />);
    await screen.findByText("오늘 조금 힘들었어요.");
    fetchMock.mockClear();

    fireEvent.change(screen.getByLabelText("상태"), {
      target: { value: "hidden" },
    });

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("status=hidden"),
        ),
      ).toBe(true),
    );
  });

  it("restores a request", async () => {
    installFakeBackend(makePage([makeItem({ status: "hidden" })]));
    render(<AdminRequests />);
    await screen.findByText("오늘 조금 힘들었어요.");

    fireEvent.click(screen.getByRole("button", { name: "복구" }));

    await waitFor(() =>
      expect(screen.getByText("복구했어요.")).toBeInTheDocument(),
    );
  });

  it("hides the 복구 button for a visible item and 영구 삭제 for a deleted one", async () => {
    installFakeBackend(
      makePage([
        makeItem({ id: "req-visible", status: "visible" }),
        makeItem({
          id: "req-deleted",
          body: "이미 삭제된 고민이에요.",
          status: "deleted",
        }),
      ]),
    );
    render(<AdminRequests />);
    await screen.findByText("오늘 조금 힘들었어요.");

    const visibleRow = screen.getByText("오늘 조금 힘들었어요.").closest("tr")!;
    expect(
      within(visibleRow).queryByRole("button", { name: "복구" }),
    ).not.toBeInTheDocument();
    expect(
      within(visibleRow).getByRole("button", { name: "영구 삭제" }),
    ).toBeInTheDocument();

    const deletedRow = screen
      .getByText("이미 삭제된 고민이에요.")
      .closest("tr")!;
    expect(
      within(deletedRow).getByRole("button", { name: "복구" }),
    ).toBeInTheDocument();
    expect(
      within(deletedRow).queryByRole("button", { name: "영구 삭제" }),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before permanently deleting a request", async () => {
    installFakeBackend(makePage([makeItem()]));
    render(<AdminRequests />);
    await screen.findByText("오늘 조금 힘들었어요.");

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
