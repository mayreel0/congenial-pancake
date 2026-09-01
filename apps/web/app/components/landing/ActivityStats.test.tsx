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
  it("shows today/total counts for requests and replies, plus waiting-for-reply", async () => {
    mockStats({
      requests: { today: 1, total: 42 },
      replies: { today: 2, total: 88 },
      waitingForReply: 3,
    });

    render(<ActivityStats />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("답변을 기다리는 글")).toBeInTheDocument();
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
