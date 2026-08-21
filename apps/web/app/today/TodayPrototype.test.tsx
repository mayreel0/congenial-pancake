import { act, fireEvent, render, screen } from "../lib/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayPrototype } from "./TodayPrototype";

describe("TodayPrototype", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("renders the focused today entry screen", () => {
    render(<TodayPrototype />);

    expect(
      screen.getByRole("heading", { name: "오늘 어떤 말을 듣고 싶나요?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보내기" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass(
      "min-h-[calc(100dvh-3.5rem-1px)]",
    );
    expect(screen.getByTestId("today-entry-layout")).toHaveClass(
      "min-h-[calc(100dvh-8.5rem-1px)]",
      "grid-rows-[1fr_auto_auto]",
    );
    expect(screen.getByTestId("today-entry-copy")).toHaveClass(
      "self-center",
      "sm:self-auto",
    );
    expect(screen.getByTestId("today-entry-composer")).toHaveClass(
      "self-end",
      "sm:self-auto",
    );
  });

  it("renders service navigation on today", async () => {
    render(<TodayPrototype />);

    expect(screen.getByRole("link", { name: "온설" })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByRole("link", { name: "남기기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Auth state resolves asynchronously (AuthProvider fetches /auth/me on mount).
    expect(
      await screen.findByRole("link", { name: "로그인" }),
    ).toHaveAttribute("href", "/login");
  });

  it("does not render the old all-in-one dashboard sections", () => {
    render(<TodayPrototype />);

    expect(screen.queryByText("답변을 기다리는 말")).not.toBeInTheDocument();
    expect(screen.queryByText("선택한 요청")).not.toBeInTheDocument();
  });

  it("enables send when mobile input events update the request", () => {
    render(<TodayPrototype />);

    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");
    fireEvent.input(textarea, {
      target: { value: "모바일에서 입력한 온설입니다." },
    });

    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
  });

  it("keeps send enabled while mobile IME composition is still active", () => {
    render(<TodayPrototype />);

    const textarea = screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?");
    fireEvent.compositionStart(textarea);
    fireEvent.input(textarea, {
      target: { value: "힘" },
    });

    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
  });

  it("shows a temporary toast after a request is submitted", async () => {
    vi.useFakeTimers();

    render(<TodayPrototype />);

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(screen.getByRole("status")).toHaveTextContent("온설을 남겼어요");
    expect(
      screen.getByRole("button", { name: "알림 닫기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("남겨졌어요")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error toast when the API rejects the submission", async () => {
    // GET /requests (initial load) keeps succeeding; POST /requests (submit)
    // is rejected with the guest-limit error code.
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/requests") && init?.method === undefined) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              statusCode: 409,
              code: "REQUEST_GUEST_LIMIT_EXCEEDED",
              message: "Guests may only post one request. Log in to post more.",
            }),
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TodayPrototype />);
    await screen.findByText("오늘 0개의 이야기가 남겨졌고, 0개의 답장이 도착했어요.");

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "비회원 두 번째 시도" },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(
      await screen.findByText(
        "비회원은 온설을 1개만 남길 수 있어요. 로그인하면 더 남길 수 있어요.",
      ),
    ).toBeInTheDocument();
    // The draft must survive a failed submission — nothing was actually sent.
    expect(
      screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"),
    ).toHaveValue("비회원 두 번째 시도");
  });

  it("lets the success toast be dismissed immediately", async () => {
    vi.useFakeTimers();

    render(<TodayPrototype />);

    fireEvent.input(screen.getByLabelText("오늘 어떤 말을 듣고 싶나요?"), {
      target: { value: "오늘은 조금 지쳤어요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });

    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
