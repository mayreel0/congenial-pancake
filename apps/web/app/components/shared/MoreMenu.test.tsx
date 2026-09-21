import { describe, expect, it, vi } from "vitest";
import { MoreMenu } from "ui/MoreMenu";
import { fireEvent, render, screen } from "../../lib/test-utils";

describe("MoreMenu", () => {
  it("tells assistive tech its trigger opens a dialog, and runs an item then closes", async () => {
    const onClick = vi.fn();
    render(
      <MoreMenu
        ariaLabel="알림 도구"
        items={[{ key: "delete", icon: null, label: "삭제하기", onClick }]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "더보기" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "알림 도구" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
