import { expect, test } from "@playwright/test";

test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed E2E smoke tests.");

test("public visitor can see the praise feed and rankings", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "칭찬받고 싶은 순간들" })).toBeVisible();

  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "랭킹" })).toBeVisible();
});
