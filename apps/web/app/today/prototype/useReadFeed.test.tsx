import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useReadFeed } from "./useReadFeed";

function ReadHarness() {
  const prototype = useReadFeed();

  return (
    <div>
      <p data-testid="feed-count">{prototype.readFeed.length}</p>
      <p data-testid="saved-count">{prototype.savedReplyIds.length}</p>
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

describe("useReadFeed", () => {
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
