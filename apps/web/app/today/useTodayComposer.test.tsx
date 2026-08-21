import { fireEvent, render, screen, waitFor } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_ONSEOL_MESSAGES, useTodayComposer } from "./useTodayComposer";

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResponse(status: number, body: unknown): FetchResponse {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Harness() {
  const composer = useTodayComposer();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void composer.submitRequest();
      }}
    >
      <p data-testid="status">{composer.requestSubmitStatus}</p>
      <p data-testid="request-count">{composer.requestCount}</p>
      <p data-testid="reply-count">{composer.replyCount}</p>
      <ul>
        {composer.todayEntryMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <textarea
        aria-label="request"
        value={composer.requestDraft}
        onChange={(event) => composer.updateRequestDraft(event.target.value)}
      />
      <button
        disabled={composer.requestSubmitStatus === "pending"}
        type="submit"
      >
        submit
      </button>
    </form>
  );
}

describe("useTodayComposer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads today's messages and counts from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          { id: "r1", body: "요청 하나", createdAt: "2026-08-22T00:00:00.000Z", replyCount: 2 },
          { id: "r2", body: "요청 둘", createdAt: "2026-08-22T00:00:00.000Z", replyCount: 1 },
        ]),
      ),
    );

    render(<Harness />);

    expect(await screen.findByText("요청 하나")).toBeInTheDocument();
    expect(screen.getByText("요청 둘")).toBeInTheDocument();
    expect(screen.getByTestId("request-count")).toHaveTextContent("2");
    expect(screen.getByTestId("reply-count")).toHaveTextContent("3");
  });

  it("falls back to canned messages when there are no requests yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])));

    render(<Harness />);

    expect(
      await screen.findByText(FALLBACK_ONSEOL_MESSAGES[0]),
    ).toBeInTheDocument();
  });

  it("shows pending, blocks duplicate submission, then clears the draft on success", async () => {
    const postDeferred = makeDeferred<FetchResponse>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockReturnValueOnce(postDeferred.promise)
      .mockResolvedValueOnce(
        jsonResponse(200, [
          { id: "r1", body: "오늘은 조금 지쳤어요.", createdAt: "2026-08-22T00:00:00.000Z", replyCount: 0 },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    await screen.findByTestId("request-count");

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    // The mutation's pending state reaches the component through React
    // Query's own subscriber notification, which lands a tick after the
    // click handler returns — wait for it rather than asserting synchronously.
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("pending"),
    );

    postDeferred.resolve(
      jsonResponse(201, {
        id: "r1",
        body: "오늘은 조금 지쳤어요.",
        createdAt: "2026-08-22T00:00:00.000Z",
        replyCount: 0,
      }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("success"),
    );
    expect(screen.getByLabelText("request")).toHaveValue("");
    await waitFor(() =>
      expect(screen.getByTestId("request-count")).toHaveTextContent("1"),
    );

    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
  });

  it("returns success status to idle when the user starts a new draft", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(
        jsonResponse(201, {
          id: "r1",
          body: "칭찬이 필요한 하루였어요.",
          createdAt: "2026-08-22T00:00:00.000Z",
          replyCount: 0,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    await screen.findByTestId("request-count");

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "칭찬이 필요한 하루였어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("success"),
    );

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "다시 쓰기" },
    });

    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });
});
