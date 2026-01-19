import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Premium matchmaking experiences designed for real connections.",
    }),
  ).toBeVisible();
});

test("application flow navigates through steps", async ({ page }) => {
  await page.route("**/api/applications/create", async (route) => {
    await route.fulfill({
      json: { applicationId: "appl_123", status: "DRAFT" },
    });
  });

  await page.route("**/api/applications/upload-photo", async (route) => {
    await route.fulfill({
      json: {
        photoUrl: "https://example.com/photo.jpg",
        applicantId: "appl_123",
      },
    });
  });

  await page.route("**/api/applications/submit", async (route) => {
    await route.fulfill({
      json: { paymentUrl: "https://mock.stripe.local/session/test" },
    });
  });

  await page.goto("/apply");
  await page.getByLabel("First name").fill("Alex");
  await page.getByLabel("Last name").fill("Smith");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Age").fill("28");
  await page.getByLabel("Gender").selectOption("FEMALE");
  await page.getByLabel("Location").fill("Phoenix, AZ");
  await page.getByLabel("Occupation").fill("Marketing Manager");
  await page.getByLabel("Education").fill("Bachelor's Degree");
  await page.getByLabel("Income Range").fill("$100,000-$150,000");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/apply\/questionnaire/);

  await page.getByLabel("Religion importance (1-5)").fill("3");
  await page.getByLabel("Political alignment").fill("moderate");
  await page.getByLabel("Family importance (1-5)").fill("4");
  await page.getByLabel("Career ambition (1-5)").fill("4");
  await page.getByLabel("About me").fill("I love good food.");
  await page.getByLabel("Ideal partner").fill("Kind and ambitious.");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/apply\/photos/);

  await page.setInputFiles("input[type=file]", {
    name: "test.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("test"),
  });
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Photo uploaded!")).toBeVisible();

  await page.getByRole("link", { name: "Continue to review" }).click();
  await expect(page).toHaveURL(/apply\/review/);

  await page.getByRole("link", { name: "Continue to payment" }).click();
  await expect(page).toHaveURL(/apply\/payment/);
  await page.getByRole("button", { name: "Start payment" }).click();
  await expect(page.getByText("Payment session created")).toBeVisible();
});

test("admin overview loads mocked data", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as { __E2E_AUTH_HEADERS__?: Record<string, string> }
    ).__E2E_AUTH_HEADERS__ = {
      "x-e2e-user-id": "admin-user",
      "x-e2e-user-email": "admin@example.com",
    };
  });
  await page.setExtraHTTPHeaders({
    "x-e2e-user-id": "admin-user",
    "x-e2e-user-email": "admin@example.com",
  });
  await page.route("**/api/admin/analytics/overview", async (route) => {
    await route.fulfill({
      json: {
        applicants: { total: 12, approved: 5, rejected: 2, waitlist: 1 },
        events: { total: 2, upcoming: 1, completed: 1 },
        revenue: { total: 19900 },
      },
    });
  });

  await page.route("**/api/admin/applications", async (route) => {
    await route.fulfill({
      json: {
        applications: [
          {
            id: "appl_1",
            firstName: "Alex",
            lastName: "Smith",
            applicationStatus: "APPROVED",
          },
        ],
      },
    });
  });

  await page.route("**/api/admin/events", async (route) => {
    await route.fulfill({
      json: {
        events: [
          {
            id: "evt_1",
            name: "Phoenix Dating Experience",
            date: new Date().toISOString(),
            status: "CONFIRMED",
          },
        ],
      },
    });
  });

  await page.goto("/admin");
  await expect(page.getByText("Business Overview")).toBeVisible();
  await expect(page.getByText("Phoenix Dating Experience")).toBeVisible();
  await expect(page.getByText("Alex Smith")).toBeVisible();
});
