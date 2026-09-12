import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "../lib/test-utils";
import { SettingsPageContent } from "./SettingsPageContent";

function mockAuthenticated(email = "test@example.com") {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ id: "1", email, createdAt: "2026-08-20T00:00:00.000Z" }),
  });
}

describe("SettingsPageContent", () => {
  it("prompts login for a guest instead of showing the form", async () => {
    render(<SettingsPageContent />);

    expect(
      await screen.findByText("로그인하면 설정을 바꿀 수 있습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("테마")).not.toBeInTheDocument();
  });

  it("shows all three settings sections once authenticated", async () => {
    mockAuthenticated();
    render(<SettingsPageContent />);

    expect(await screen.findByText("테마")).toBeInTheDocument();
    expect(screen.getByText("404 페이지 배경")).toBeInTheDocument();
    expect(screen.getByText("모션")).toBeInTheDocument();
  });

  it("switching theme updates data-theme and persists to localStorage", async () => {
    mockAuthenticated();
    render(<SettingsPageContent />);

    fireEvent.click(await screen.findByRole("radio", { name: "다크" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(JSON.parse(localStorage.getItem("onseol:site-settings")!).theme).toBe(
      "dark",
    );
  });

  it("hides the manual season/time pickers until 'manual' is turned on", async () => {
    mockAuthenticated();
    render(<SettingsPageContent />);

    await screen.findByText("테마");
    expect(screen.queryByLabelText("계절")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("switch", { name: "계절/시간대를 직접 고르기" }),
    );

    expect(screen.getByLabelText("계절")).toBeInTheDocument();
    expect(screen.getByLabelText("시간대")).toBeInTheDocument();
  });

  it("turning off the 404 background hides the mood pickers entirely", async () => {
    mockAuthenticated();
    render(<SettingsPageContent />);

    await screen.findByText("테마");
    fireEvent.click(
      screen.getByRole("switch", {
        name: "404 페이지에 계절/시간대 배경 효과 보이기",
      }),
    );

    expect(
      screen.queryByRole("switch", { name: "계절/시간대를 직접 고르기" }),
    ).not.toBeInTheDocument();
  });
});
