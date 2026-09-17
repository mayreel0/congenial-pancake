import { fireEvent, render, screen, waitFor } from "../lib/test-utils";
import { describe, expect, it } from "vitest";
import { AdminShell } from "./AdminShell";

describe("AdminShell", () => {
  it("closes the mobile menu on an outside click", async () => {
    render(<AdminShell activePath="/requests">내용</AdminShell>);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    expect(screen.getByLabelText("모바일 관리 메뉴")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    // POPOVER_EXIT_MS is 0 in tests, but the unmount still happens after a
    // timer tick (useAnimatedPresence's exit-animation delay), not
    // synchronously within the same event handler.
    await waitFor(() =>
      expect(screen.queryByLabelText("모바일 관리 메뉴")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
  });

  it("does not close the mobile menu when clicking inside it", () => {
    render(<AdminShell activePath="/requests">내용</AdminShell>);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    const mobileMenu = screen.getByLabelText("모바일 관리 메뉴");

    fireEvent.mouseDown(mobileMenu);

    expect(screen.getByLabelText("모바일 관리 메뉴")).toBeInTheDocument();
  });
});
