import { expect, test } from "@playwright/test";

test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed E2E smoke tests.");

test("public visitor can see the praise feed and rankings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "칭찬", exact: true })).toBeVisible();

  await page.goto("/posts");
  await expect(page.getByRole("heading", { name: "칭찬받고 싶은 순간들" })).toBeVisible();

  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "랭킹", exact: true })).toBeVisible();
});

test("seeded author can log in and create a praise request", async ({ page }) => {
  const title = `E2E 칭찬 요청 ${Date.now()}`;
  const comment = `E2E 칭찬 댓글 ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("이메일").fill("author@example.com");
  await page.getByLabel("비밀번호").fill("password1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "칭찬", exact: true })).toBeVisible();

  await page.goto("/posts/new");
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("본문").fill("테스트로 작은 일을 끝냈어요.");
  await page.getByLabel("칭찬받고 싶은 점").fill("꾸준히 마무리한 점");
  await page.getByRole("button", { name: "올리기" }).click();

  await expect(page.getByRole("heading", { name: "칭찬받고 싶은 순간들" })).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("heading", { name: title }).click();
  const commentInput = page.locator('textarea[name="body"]');
  await commentInput.fill(comment);
  await expect(commentInput).toHaveValue(comment);
  await expect(page.getByRole("button", { name: "칭찬 남기기" })).toBeEnabled();
  const commentResponse = page.waitForResponse((response) => response.url().includes("/api/posts/") && response.url().endsWith("/comments"));
  await page.getByRole("button", { name: "칭찬 남기기" }).click();
  expect((await commentResponse).ok()).toBe(true);
  await expect(page.getByText(comment)).toBeVisible();

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("heading", { name: "칭찬", exact: true })).toBeVisible();
});

test("seeded moderator can open moderation tools", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("moderator@example.com");
  await page.getByLabel("비밀번호").fill("password1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "칭찬", exact: true })).toBeVisible();

  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "운영 검토" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 칭찬 제어" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "보류 댓글" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신고" })).toBeVisible();
});
