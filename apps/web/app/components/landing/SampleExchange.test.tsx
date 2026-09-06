import { act, render, screen, waitFor } from "../../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SampleExchange } from "./SampleExchange";

function mockSamples(samples: unknown[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ samples }),
  });
}

describe("SampleExchange", () => {
  it("shows the first sample's request and reply", async () => {
    mockSamples([
      {
        request: { body: "요청 1", createdAt: "2026-09-01T00:00:00.000Z" },
        reply: { body: "답장 1", createdAt: "2026-09-01T00:05:00.000Z" },
      },
    ]);

    render(<SampleExchange />);

    expect(await screen.findByText("요청 1")).toBeInTheDocument();
    expect(screen.getByText("답장 1")).toBeInTheDocument();
  });

  it("renders nothing when there are no samples", async () => {
    mockSamples([]);

    const { container } = render(<SampleExchange />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("renders nothing when the fetch fails", async () => {
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

    const { container } = render(<SampleExchange />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  describe("rotation", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("cycles to the next sample after the rotation interval", async () => {
      mockSamples([
        {
          request: { body: "요청 1", createdAt: "2026-09-01T00:00:00.000Z" },
          reply: { body: "답장 1", createdAt: "2026-09-01T00:05:00.000Z" },
        },
        {
          request: { body: "요청 2", createdAt: "2026-09-01T01:00:00.000Z" },
          reply: { body: "답장 2", createdAt: "2026-09-01T01:05:00.000Z" },
        },
      ]);

      // shouldAdvanceTime keeps real time flowing alongside the fake clock
      // — needed both for findByText's own setInterval-based polling and
      // for the fetch mock's promise to actually resolve — while the
      // rotation's own setInterval is registered as fake from mount, so
      // advanceTimersByTime below can fast-forward it.
      vi.useFakeTimers({ shouldAdvanceTime: true });

      render(<SampleExchange />);

      expect(await screen.findByText("요청 1")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.getByText("요청 2")).toBeInTheDocument();
      expect(screen.queryByText("요청 1")).not.toBeInTheDocument();
    });

    it("does not rotate when there is only one sample", async () => {
      mockSamples([
        {
          request: { body: "요청 1", createdAt: "2026-09-01T00:00:00.000Z" },
          reply: { body: "답장 1", createdAt: "2026-09-01T00:05:00.000Z" },
        },
      ]);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      render(<SampleExchange />);

      expect(await screen.findByText("요청 1")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.getByText("요청 1")).toBeInTheDocument();
    });
  });
});
