import { expect, test } from "@playwright/test";

test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed E2E smoke tests.");

test("public visitor can see the comfort MVP home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "위로", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "위로 요청하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다른 사람에게 답변하기" })).toBeVisible();
});

test("seeded author can log in and create a comfort request", async ({ page }) => {
  const requestBody = `E2E 위로 요청 ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("이메일").fill("author@example.com");
  await page.getByLabel("비밀번호").fill("password1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "위로", exact: true })).toBeVisible();

  await page.getByLabel("오늘 어떤 말을 듣고 싶나요?").fill(requestBody);
  await page.getByRole("button", { name: "위로 요청 남기기" }).click();
  await expect(page.getByText(/오늘은 이미 위로 요청을 남겼어요/)).toBeVisible();
});

test("new user can sign up with email credentials", async ({ page }) => {
  const unique = Date.now();
  const email = `signup-${unique}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("닉네임").fill(`가입러${unique}`);
  await page.getByLabel("비밀번호").fill("password1234");
  await page.getByRole("button", { name: "가입하기" }).click();

  await expect(page.getByRole("heading", { name: "위로", exact: true })).toBeVisible();
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "내 활동" })).toBeVisible();
});

test("seeded moderator can open moderation tools", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("moderator@example.com");
  await page.getByLabel("비밀번호").fill("password1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "위로", exact: true })).toBeVisible();

  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "운영 검토" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 설정" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "보류된 위로 요청" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "보류된 답변" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "신고" })).toBeVisible();
});
