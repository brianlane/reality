import { expect, test } from "@playwright/test";

test.skip("application flow navigates through steps", async ({ page }) => {
  const fillStableById = async (id: string, value: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const locator = page.locator(`#${id}`);
        await expect(locator).toBeVisible();
        await locator.fill(value);
        return;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await page.waitForTimeout(100);
      }
    }
  };

  await page.route("**/api/applications/create", async (route) => {
    await route.fulfill({
      json: { applicationId: "appl_123", status: "PAYMENT_PENDING" },
    });
  });

  await page.route("**/api/applications/questionnaire**", async (route) => {
    if (route.request().method() === "GET") {
      // GET: Load questionnaire
      await route.fulfill({
        json: {
          sections: [
            {
              id: "sec_1",
              title: "About You",
              description: "Tell us about yourself",
              questions: [
                {
                  id: "q1",
                  prompt: "Religion importance (1-5)",
                  helperText: null,
                  type: "NUMBER_SCALE",
                  options: { min: 1, max: 5, step: 1 },
                  isRequired: true,
                },
                {
                  id: "q2",
                  prompt: "Political alignment",
                  helperText: null,
                  type: "TEXT",
                  options: null,
                  isRequired: true,
                },
                {
                  id: "q3",
                  prompt: "Family importance (1-5)",
                  helperText: null,
                  type: "NUMBER_SCALE",
                  options: { min: 1, max: 5, step: 1 },
                  isRequired: true,
                },
                {
                  id: "q4",
                  prompt: "Career ambition (1-5)",
                  helperText: null,
                  type: "NUMBER_SCALE",
                  options: { min: 1, max: 5, step: 1 },
                  isRequired: true,
                },
                {
                  id: "q5",
                  prompt: "About me",
                  helperText: null,
                  type: "TEXTAREA",
                  options: null,
                  isRequired: true,
                },
                {
                  id: "q6",
                  prompt: "Ideal partner",
                  helperText: null,
                  type: "TEXTAREA",
                  options: null,
                  isRequired: true,
                },
              ],
            },
          ],
          answers: {},
        },
      });
    } else {
      // POST: Submit questionnaire
      await route.fulfill({
        status: 200,
        json: { saved: true },
      });
    }
  });

  await page.route("**/api/applications/upload-photo", async (route) => {
    await route.fulfill({
      json: {
        photoUrl: "https://example.com/photo.jpg",
        applicantId: "appl_123",
      },
    });
  });

  let submitCallCount = 0;
  await page.route("**/api/applications/submit", async (route) => {
    submitCallCount += 1;
    if (submitCallCount === 1) {
      // First call: payment creation (status is PAYMENT_PENDING)
      await route.fulfill({
        json: {
          paymentUrl: "https://mock.stripe.local/session/test",
          applicationId: "appl_123",
        },
      });
    } else {
      // Second call: final submission (status is DRAFT after payment)
      await route.fulfill({
        json: {
          applicationId: "appl_123",
          status: "SUBMITTED",
        },
      });
    }
  });

  // Set up localStorage to pass authorization check
  await page.addInitScript(() => {
    localStorage.setItem("applicationId", "appl_123");
  });

  await page.goto("/apply/demographics");
  await page.waitForLoadState("networkidle");
  await fillStableById("firstName", "Alex");
  await fillStableById("lastName", "Smith");
  await fillStableById("email", "alex@example.com");
  await fillStableById("age", "28");
  await page.getByLabel("Gender").selectOption("FEMALE");
  await fillStableById("location", "Phoenix, AZ");
  await fillStableById("occupation", "Marketing Manager");
  await fillStableById("education", "Bachelor's Degree");
  await fillStableById("incomeRange", "$100,000-$150,000");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/apply\/payment/);

  // Payment step
  await page.getByRole("button", { name: "Start payment" }).click();
  await expect(page.getByText("Payment session created")).toBeVisible();

  // Simulate payment success by manually navigating to questionnaire
  // (In real flow, Stripe webhook would update status to DRAFT and user would navigate back)
  await page.goto("/apply/questionnaire");
  await page.waitForLoadState("networkidle");

  // Fill in questionnaire fields (using simpler selectors since labels aren't properly linked)
  // We need to target inputs within the form, not globally
  const form = page.locator("form");
  const numberInputs = await form.locator('input[type="number"]').all();
  if (numberInputs[0]) await numberInputs[0].fill("3");
  if (numberInputs[1]) await numberInputs[1].fill("4");
  if (numberInputs[2]) await numberInputs[2].fill("4");

  const textInputs = await form.locator('input[type="text"]').all();
  if (textInputs[0]) await textInputs[0].fill("moderate");

  const textareas = await form.locator("textarea").all();
  if (textareas[0]) await textareas[0].fill("I love good food.");
  if (textareas[1]) await textareas[1].fill("Kind and ambitious.");

  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL(/apply\/photos/, { timeout: 15000 }),
    page.getByRole("button", { name: "Save and continue" }).click(),
  ]);

  await page.setInputFiles("input[type=file]", {
    name: "test.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("test"),
  });
  await page.getByRole("button", { name: "Upload photo" }).click();
  await expect(page.getByText("Photo uploaded!")).toBeVisible();

  // Final submission (no review page in new flow)
  await page.getByRole("button", { name: "Submit Application" }).click();
  await expect(page).toHaveURL(/apply\/waitlist/);
});

test.skip("admin overview loads mocked data", async ({ page }) => {
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
