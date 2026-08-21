import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAnswerQueue } from "./useAnswerQueue";

function AnswerHarness() {
  const prototype = useAnswerQueue();
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
            value={prototype.replyDrafts[target.id] ?? ""}
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

describe("useAnswerQueue", () => {
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
