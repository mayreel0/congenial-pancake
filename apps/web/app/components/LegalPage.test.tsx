import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage } from "./LegalPage";

describe("LegalPage", () => {
  it("renders the supplied title as the only level-one heading", () => {
    render(<LegalPage title="테스트 정책">본문</LegalPage>);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "테스트 정책" }),
    ).toBeVisible();
  });

  it("renders child headings and body content inside the article", () => {
    render(
      <LegalPage title="테스트 정책">
        <section>
          <h2>정책 세부 내용</h2>
          <p>전달한 정책 본문입니다.</p>
        </section>
      </LegalPage>,
    );

    const article = within(screen.getByRole("article"));
    expect(
      article.getByRole("heading", { level: 2, name: "정책 세부 내용" }),
    ).toBeVisible();
    expect(article.getByText("전달한 정책 본문입니다.")).toBeVisible();
  });

  it("links back to the home page from main", () => {
    render(<LegalPage title="테스트 정책">본문</LegalPage>);

    expect(
      within(screen.getByRole("main")).getByRole("link", {
        name: "온설 홈으로",
      }),
    ).toHaveAttribute("href", "/");
  });

  it("shows policy and contact links in the footer navigation", () => {
    render(<LegalPage title="테스트 정책">본문</LegalPage>);

    const footer = within(screen.getByRole("contentinfo"));
    const navigation = within(
      footer.getByRole("navigation", { name: "서비스 정책 및 문의" }),
    );
    expect(navigation.getByRole("link", { name: "이용약관" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      navigation.getByRole("link", { name: "개인정보처리방침" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      navigation.getByRole("link", { name: "문의 admin@onseol.com" }),
    ).toHaveAttribute("href", "mailto:admin@onseol.com");
  });
});
