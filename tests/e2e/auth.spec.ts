import { expect, test } from "@playwright/test";

test("no user to admin redirects to admin login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page).toHaveURL(/next=%2Fadmin/);
});

test("no user to client redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page).toHaveURL(/next=%2Fdashboard/);
});

test("unauthenticated events route redirects to sign-in with next", async ({
  page,
}) => {
  await page.goto("/events");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page).toHaveURL(/next=%2Fevents/);
});

test("unauthenticated matches route redirects to sign-in with next", async ({
  page,
}) => {
  await page.goto("/matches");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page).toHaveURL(/next=%2Fmatches/);
});
