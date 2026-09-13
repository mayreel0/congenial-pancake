import { render, screen, waitFor } from "../../lib/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ActivityStats } from "./ActivityStats";

function mockStats(body: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

describe("ActivityStats", () => {
  it("shows cumulative totals and how many are waiting for a reply, as sentences", async () => {
    mockStats({
      requests: { today: 1, total: 42 },
      replies: { today: 2, total: 88 },
      waitingForReply: 3,
    });

    render(<ActivityStats />);

    expect(
      await screen.findByText("지금까지 42개의 이야기가 남겨졌고, 88개의 따뜻한 답장이 도착했어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("지금 3개의 이야기가 답장을 기다리고 있어요."),
    ).toBeInTheDocument();
  });

  it("omits the waiting-for-reply line when nothing is waiting", async () => {
    mockStats({
      requests: { today: 0, total: 42 },
      replies: { today: 0, total: 88 },
      waitingForReply: 0,
    });

    render(<ActivityStats />);

    await screen.findByText("지금까지 42개의 이야기가 남겨졌고, 88개의 따뜻한 답장이 도착했어요.");
    expect(
      screen.queryByText(/답장을 기다리고 있어요/),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when the fetch fails, instead of an error state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          statusCode: 500,
          code: "INTERNAL_ERROR",
          message: "boom",
        }),
    });

    const { container } = render(<ActivityStats />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
