import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTodayComposer } from "./useTodayComposer";

function Harness() {
  const prototype = useTodayComposer();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void prototype.submitRequest();
      }}
    >
      <p data-testid="status">{prototype.requestSubmitStatus}</p>
      <p data-testid="request-count">{prototype.requestCount}</p>
      <textarea
        aria-label="request"
        value={prototype.requestDraft}
        onChange={(event) => prototype.updateRequestDraft(event.target.value)}
      />
      <button
        disabled={prototype.requestSubmitStatus === "pending"}
        type="submit"
      >
        submit
      </button>
    </form>
  );
}

describe("useTodayComposer", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("shows pending, blocks duplicate submission, then clears the draft on success", async () => {
    vi.useFakeTimers();

    render(<Harness />);

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.getByTestId("status")).toHaveTextContent("pending");

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("success");
    expect(screen.getByLabelText("request")).toHaveValue("");
    expect(screen.getByTestId("request-count")).toHaveTextContent("3");
  });

  it("returns success status to idle when the user starts a new draft", async () => {
    vi.useFakeTimers();

    render(<Harness />);

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "칭찬이 필요한 하루였어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    fireEvent.change(screen.getByLabelText("request"), {
      target: { value: "다시 쓰기" },
    });

    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });
});
