import { describe, expect, it } from "vitest";
import { render, screen } from "./lib/test-utils";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("shows the 404 message and a link back home", () => {
    render(<NotFound />);

    expect(screen.getByText("찾으시는 페이지가 없어요")).toBeInTheDocument();
    const homeLink = screen.getByRole("link", { name: "메인으로 돌아가기" });
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
