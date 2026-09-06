import { useParams } from "next/navigation";
import { fireEvent, render, screen, waitFor } from "../../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RequestsListPage from "./page";

type MockResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function installFakeBackend({
  items = [],
  status = 200,
}: {
  items?: unknown[];
  status?: number;
}) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<MockResponse> => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/auth/me")) {
        return Promise.resolve(jsonResponse(401, { code: "UNAUTHORIZED" }));
      }

      if (url.includes("/requests")) {
        if (status >= 400) {
          return Promise.resolve(jsonResponse(status, { statusCode: status }));
        }
        const requestedUrl = new URL(url);
        const pageSize = Number(requestedUrl.searchParams.get("pageSize") ?? "10");
        return Promise.resolve(
          jsonResponse(200, {
            items,
            page: Number(requestedUrl.searchParams.get("page") ?? "1"),
            pageSize,
            totalItems: items.length,
            totalPages: 1,
          }),
        );
      }

      throw new Error(`Unmocked fetch: ${url}`);
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RequestsListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an invalid-address message for a malformed slug", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "no-discriminator-here" });
    installFakeBackend({});

    render(<RequestsListPage />);

    expect(
      await screen.findByText("잘못된 프로필 주소입니다."),
    ).toBeInTheDocument();
  });

  it("shows each request linking to its own detail page", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      items: [
        {
          id: "request-1",
          body: "요즘 마음이 자꾸 가라앉아요.",
          createdAt: "2026-08-20T10:15:00.000Z",
        },
      ],
    });

    render(<RequestsListPage />);

    expect(
      await screen.findByText("요즘 마음이 자꾸 가라앉아요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /요즘 마음이 자꾸 가라앉아요\./ }),
    ).toHaveAttribute("href", "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/requests/request-1");
    expect(
      screen.getByRole("link", { name: "← 민들레#D59D" }),
    ).toHaveAttribute("href", "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D");
  });

  it("shows an empty message when there is nothing to list", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({ items: [] });

    render(<RequestsListPage />);

    expect(await screen.findByText("공개한 고민이 없습니다.")).toBeInTheDocument();
  });

  it("shows a not-found message when the list is hidden or the profile doesn't exist", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({ status: 404 });

    render(<RequestsListPage />);

    expect(
      await screen.findByText("존재하지 않거나 비공개로 설정된 목록입니다."),
    ).toBeInTheDocument();
  });

  it("re-fetches with the selected page size, resetting to page 1", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    const fetchMock = installFakeBackend({ items: [] });

    render(<RequestsListPage />);
    await screen.findByText("공개한 고민이 없습니다.");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });

    await waitFor(() => {
      const requestCalls = fetchMock.mock.calls.filter(([input]) =>
        (typeof input === "string" ? input : input.toString()).includes(
          "/requests?",
        ),
      );
      const [input] = requestCalls.at(-1)!;
      const requestedUrl = new URL(
        typeof input === "string" ? input : input.toString(),
      );
      expect(requestedUrl.searchParams.get("pageSize")).toBe("50");
      // fetchPublicRequests sends page whenever it's truthy, and
      // parsePageParam(undefined) resolves to 1 — the URL's own ?page= is
      // what gets omitted on reset, not the backend request's param.
      expect(requestedUrl.searchParams.get("page")).toBe("1");
    });
  });
});
