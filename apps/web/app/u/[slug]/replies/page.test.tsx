import { useParams } from "next/navigation";
import { fireEvent, render, screen, waitFor } from "../../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RepliesListPage from "./page";

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

      if (url.includes("/replies")) {
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

describe("RepliesListPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an invalid-address message for a malformed slug", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "no-discriminator-here" });
    installFakeBackend({});

    render(<RepliesListPage />);

    expect(
      await screen.findByText("잘못된 프로필 주소입니다."),
    ).toBeInTheDocument();
  });

  it("shows each reply linking to its own detail page", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({
      items: [
        {
          id: "reply-1",
          body: "잘 하셨어요.",
          createdAt: "2026-08-21T11:30:00.000Z",
          requestId: "request-2",
          requestBody: "오늘도 무사히 지나갔어요.",
        },
      ],
    });

    render(<RepliesListPage />);

    expect(await screen.findByText("잘 하셨어요.")).toBeInTheDocument();
    expect(
      screen.getByText('"오늘도 무사히 지나갔어요."에 남긴 답변'),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /잘 하셨어요\./ })).toHaveAttribute(
      "href",
      "/u/%EB%AF%BC%EB%93%A4%EB%A0%88-D59D/replies/reply-1",
    );
  });

  it("shows an empty message when there is nothing to list", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({ items: [] });

    render(<RepliesListPage />);

    expect(await screen.findByText("공개한 답변이 없습니다.")).toBeInTheDocument();
  });

  it("shows a not-found message when the list is hidden or the profile doesn't exist", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    installFakeBackend({ status: 404 });

    render(<RepliesListPage />);

    expect(
      await screen.findByText("존재하지 않거나 비공개로 설정된 목록입니다."),
    ).toBeInTheDocument();
  });

  it("re-fetches with the selected page size", async () => {
    vi.mocked(useParams).mockReturnValue({ slug: "민들레-D59D" });
    const fetchMock = installFakeBackend({ items: [] });

    render(<RepliesListPage />);
    await screen.findByText("공개한 답변이 없습니다.");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });

    await waitFor(() => {
      const repliesCalls = fetchMock.mock.calls.filter(([input]) =>
        (typeof input === "string" ? input : input.toString()).includes(
          "/replies?",
        ),
      );
      const [input] = repliesCalls.at(-1)!;
      const requestedUrl = new URL(
        typeof input === "string" ? input : input.toString(),
      );
      expect(requestedUrl.searchParams.get("pageSize")).toBe("50");
    });
  });
});
