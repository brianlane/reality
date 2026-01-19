import { expect, test } from "@playwright/test";

const adminHeaders = {
  "x-e2e-user-id": "admin-user",
  "x-e2e-user-email": "admin@example.com",
};

const clientHeaders = {
  "x-e2e-user-id": "client-user",
  "x-e2e-user-email": "client@example.com",
};

async function mockApplicantApis(page: import("@playwright/test").Page) {
  await page.route("**/api/applicant/dashboard", async (route) => {
    await route.fulfill({
      json: {
        application: { id: "appl_1", status: "APPROVED" },
        stats: { eventsAttended: 1, matchesReceived: 2, datesCompleted: 0 },
      },
    });
  });
  await page.route("**/api/applicant/events**", async (route) => {
    await route.fulfill({
      json: {
        events: [
          {
            id: "evt_1",
            name: "Phoenix Dating Experience",
            date: new Date().toISOString(),
            venue: "Phoenix",
            invitationStatus: "INVITED",
          },
        ],
      },
    });
  });
  await page.route("**/api/applicant/matches", async (route) => {
    await route.fulfill({
      json: {
        matches: [
          {
            id: "match_1",
            eventName: "Phoenix Dating Experience",
            partner: { firstName: "Taylor" },
            outcome: "INTRO",
          },
        ],
      },
    });
  });
}

test("admin to client allows dashboard access", async ({ page }) => {
  await page.setExtraHTTPHeaders(adminHeaders);
  await mockApplicantApis(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("client to client allows dashboard access", async ({ page }) => {
  await page.setExtraHTTPHeaders(clientHeaders);
  await mockApplicantApis(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("no user to admin redirects to admin login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("no user to client redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});
