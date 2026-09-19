import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "../lib/test-utils";
import { PushStatusNotice } from "./PushStatusNotice";

const pushSupported = vi.fn();
const getOwnPushSubscription = vi.fn();
vi.mock("../lib/notifications/push", () => ({
  pushSupported: () => pushSupported(),
  getOwnPushSubscription: () => getOwnPushSubscription(),
}));

describe("PushStatusNotice", () => {
  beforeEach(() => {
    pushSupported.mockReturnValue(true);
    getOwnPushSubscription.mockResolvedValue(null);
  });

  it("says push is on and links to settings when the account is subscribed", async () => {
    getOwnPushSubscription.mockResolvedValue({ endpoint: "x" });
    render(<PushStatusNotice />);

    expect(await screen.findByText("켜져 있어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("says push is off when it isn't", async () => {
    render(<PushStatusNotice />);

    expect(await screen.findByText("꺼져 있어요")).toBeInTheDocument();
  });

  it("shows nothing on a browser that can't do push", async () => {
    pushSupported.mockReturnValue(false);
    const { container } = render(<PushStatusNotice />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
