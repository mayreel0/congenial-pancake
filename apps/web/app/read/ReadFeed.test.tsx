import { fireEvent, render, screen, within } from "../lib/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { PROTOTYPE_STORAGE_KEYS } from "../today/prototype/storage-keys";
import { ReadFeed } from "./ReadFeed";

function seed(
  requests: Array<Record<string, unknown>>,
  replies: Array<Record<string, unknown>>,
) {
  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.requests,
    JSON.stringify(requests),
  );
  window.localStorage.setItem(
    PROTOTYPE_STORAGE_KEYS.replies,
    JSON.stringify(replies),
  );
}

describe("ReadFeed", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows only requests with at least one visible reply, including the viewer's own", async () => {
    seed(
      [
        {
          id: "with-reply",
          body: "답변이 있는 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "no-reply",
          body: "답변이 없는 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "mine",
          body: "내가 쓴 요청",
          createdAt: new Date().toISOString(),
          authorId: "viewer-local",
          replyIds: ["r2"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "with-reply",
          body: "답변입니다",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
        {
          id: "r2",
          requestId: "mine",
          body: "내 요청에 달린 답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-2",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);

    expect(await screen.findByText("답변이 있는 요청")).toBeInTheDocument();
    expect(screen.getByText("내가 쓴 요청")).toBeInTheDocument();
    expect(screen.queryByText("답변이 없는 요청")).not.toBeInTheDocument();
  });

  it("toggles save instantly with no confirmation", async () => {
    seed(
      [
        {
          id: "req-1",
          body: "요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "req-1",
          body: "답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);
    await screen.findByText("요청");

    fireEvent.click(screen.getByRole("button", { name: "마음에 남기기" }));

    expect(
      screen.getByRole("button", { name: /마음에 남긴 답변/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("toggles save per reply, independent of other replies on the same request", async () => {
    seed(
      [
        {
          id: "req-1",
          body: "여러 답변이 달린 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1", "r2"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "req-1",
          body: "첫 번째 답변",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
        {
          id: "r2",
          requestId: "req-1",
          body: "두 번째 답변",
          createdAt: "2026-08-19T10:00:00.000Z",
          authorId: "replier-2",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);
    await screen.findByText("여러 답변이 달린 요청");

    const [firstSaveButton, secondSaveButton] = screen.getAllByRole(
      "button",
      { name: "마음에 남기기" },
    );

    fireEvent.click(firstSaveButton);

    expect(firstSaveButton).toHaveAttribute("aria-pressed", "true");
    expect(secondSaveButton).toHaveAttribute("aria-pressed", "false");
  });

  it("requires confirmation before a report removes an item, and removes the whole card when the only reply is reported", async () => {
    seed(
      [
        {
          id: "req-1",
          body: "요청 본문",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: ["r1"],
          reportCount: 0,
          hidden: false,
        },
      ],
      [
        {
          id: "r1",
          requestId: "req-1",
          body: "유일한 답변",
          createdAt: new Date().toISOString(),
          authorId: "replier-1",
          reportCount: 0,
          hidden: false,
        },
      ],
    );

    render(<ReadFeed />);
    await screen.findByText("요청 본문");

    const [, replyMoreButton] = screen.getAllByRole("button", {
      name: "더보기",
    });

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByText("요청 본문")).toBeInTheDocument();

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "신고하기" }));

    expect(screen.queryByText("요청 본문")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing qualifies", async () => {
    seed(
      [
        {
          id: "no-reply",
          body: "답변이 없는 요청",
          createdAt: new Date().toISOString(),
          authorId: "other-author",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      [],
    );

    render(<ReadFeed />);

    expect(
      await screen.findByText("아직 읽을 수 있는 온설이 없어요."),
    ).toBeInTheDocument();
  });
});
