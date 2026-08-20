import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnseolPrototype } from "./useOnseolPrototype";

function Harness() {
  const prototype = useOnseolPrototype();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void prototype.submitRequest();
      }}
    >
      <p data-testid="status">{prototype.requestSubmitStatus}</p>
      <p data-testid="request-count">{prototype.state.requests.length}</p>
      <textarea
        aria-label="request"
        value={prototype.state.requestDraft}
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

describe("useOnseolPrototype request submission", () => {
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

function AnswerHarness() {
  const prototype = useOnseolPrototype();
  const target = prototype.currentAnswerTarget;

  return (
    <div>
      <p data-testid="target-body">{target?.body ?? "없음"}</p>
      <p data-testid="held-count">{prototype.heldRequests.length}</p>
      <p data-testid="log-count">{prototype.answerLog.length}</p>
      <p data-testid="answering-held">
        {prototype.isAnsweringHeldRequest ? "yes" : "no"}
      </p>
      {target ? (
        <>
          <button onClick={() => prototype.skipRequest(target.id)}>
            skip
          </button>
          <button onClick={() => prototype.holdRequest(target.id)}>
            hold
          </button>
          <textarea
            aria-label="answer"
            value={prototype.state.replyDrafts[target.id] ?? ""}
            onChange={(event) =>
              prototype.updateReplyDraft(target.id, event.target.value)
            }
          />
          <button onClick={() => prototype.submitReply(target.id)}>
            submit
          </button>
        </>
      ) : null}
      {prototype.heldRequests.map((request) => (
        <button
          key={request.id}
          onClick={() => prototype.openHeldRequest(request.id)}
        >
          open {request.body}
        </button>
      ))}
    </div>
  );
}

describe("useOnseolPrototype answer session", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("moves the queue forward when the current target is skipped", () => {
    render(<AnswerHarness />);

    const firstTarget = screen.getByTestId("target-body").textContent;
    fireEvent.click(screen.getByRole("button", { name: "skip" }));

    expect(screen.getByTestId("target-body").textContent).not.toEqual(
      firstTarget,
    );
  });

  it("moves a held target out of the live queue and into the hold list", () => {
    render(<AnswerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "hold" }));

    expect(screen.getByTestId("held-count")).toHaveTextContent("1");
  });

  it("answers a held request, removes it from the hold list, and adds it to the log", () => {
    render(<AnswerHarness />);

    fireEvent.click(screen.getByRole("button", { name: "hold" }));
    const openButton = screen.getAllByRole("button", { name: /^open / })[0];
    fireEvent.click(openButton);

    expect(screen.getByTestId("answering-held")).toHaveTextContent("yes");

    fireEvent.change(screen.getByLabelText("answer"), {
      target: { value: "짧은 답변입니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.getByTestId("held-count")).toHaveTextContent("0");
    expect(screen.getByTestId("log-count")).toHaveTextContent("1");
    expect(screen.getByTestId("answering-held")).toHaveTextContent("no");
  });
});

function ReadHarness() {
  const prototype = useOnseolPrototype();

  return (
    <div>
      <p data-testid="feed-count">{prototype.readFeed.length}</p>
      <p data-testid="saved-count">{prototype.state.savedReplyIds.length}</p>
      {prototype.readFeed.map((item) =>
        item.replies.map((reply) => (
          <button
            key={reply.id}
            onClick={() => prototype.toggleSavedReply(reply.id)}
          >
            toggle {reply.body}
          </button>
        )),
      )}
    </div>
  );
}

describe("useOnseolPrototype read feed", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("exposes the read feed from seed data", () => {
    render(<ReadHarness />);

    expect(screen.getByTestId("feed-count")).toHaveTextContent("2");
  });

  it("toggles a reply in and out of savedReplyIds and persists it", () => {
    render(<ReadHarness />);

    const target = screen.getAllByRole("button", { name: /^toggle / })[0];
    fireEvent.click(target);
    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");

    fireEvent.click(target);
    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");
  });
});
