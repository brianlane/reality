/**
 * E2E tests for the VoiceTextareaInput component in the questionnaire.
 *
 * Real microphone / Supabase storage are not needed:
 * • navigator.mediaDevices.getUserMedia  — replaced by an initScript that
 *   returns a fake MediaStream whose tracks can be stopped.
 * • MediaRecorder                        — replaced by a fake that emits one
 *   synthetic dataavailable chunk and fires onstop after a short delay.
 * • All backend routes are intercepted via page.route().
 *
 * New flow (no client-side transcription):
 *   Voice answer → recording → "Stop recording" → recorded (audio preview)
 *   → "Save recording" → uploading → confirmed ("Voice recording saved ✓")
 */

import { expect, test, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Browser-side stubs injected before any page script runs
// ---------------------------------------------------------------------------

const FAKE_MEDIA_RECORDER_SCRIPT = `
  (() => {
    function makeFakeStream() {
      return { getTracks: () => [{ stop: () => {} }] };
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: async () => makeFakeStream(),
      },
    });

    class FakeMediaRecorder {
      constructor(stream, opts) {
        this._mimeType = (opts && opts.mimeType) ? opts.mimeType : 'audio/webm';
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
      }

      get mimeType() { return this._mimeType; }

      start(timeslice) {
        this.state = 'recording';
        const self = this;
        setTimeout(() => {
          if (self.ondataavailable) {
            const ev = new Event('dataavailable');
            Object.defineProperty(ev, 'data', {
              value: new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], {
                type: 'audio/webm',
              }),
            });
            self.ondataavailable(ev);
          }
        }, 20);
      }

      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        const self = this;
        setTimeout(() => {
          if (self.onstop) self.onstop(new Event('stop'));
        }, 30);
      }

      static isTypeSupported(type) {
        return (
          type === 'audio/webm' ||
          type === 'audio/webm;codecs=opus' ||
          type === 'audio/mp4'
        );
      }
    }

    window.MediaRecorder = FakeMediaRecorder;
  })();
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function voiceAnswerButton(page: Page) {
  return page.locator("button").filter({ hasText: /^Voice answer$/i });
}

// CSP connect-src only allows https://*.supabase.co
const E2E_FAKE_SUPABASE_ORIGIN = "https://e2e-voice-fake.supabase.co";

function e2eFakeSignedPutUrl(suffix: string): string {
  return `${E2E_FAKE_SUPABASE_ORIGIN}/storage/v1/object/signed/${suffix}`;
}

async function routeFakeSupabaseSignedPut(page: Page) {
  await page.route("**/*e2e-voice-fake.supabase.co/**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

// ---------------------------------------------------------------------------
// Shared questionnaire mock payload (one required TEXTAREA question)
// ---------------------------------------------------------------------------

const QUESTIONNAIRE_RESPONSE = {
  pages: [],
  sections: [
    {
      id: "sec_voice",
      title: "About You",
      description: null,
      questions: [
        {
          id: "q_voice",
          prompt: "Tell us about yourself",
          helperText: null,
          type: "TEXTAREA",
          options: null,
          isRequired: true,
        },
      ],
    },
  ],
  answers: {},
};

// ---------------------------------------------------------------------------
// Common mocks applied in beforeEach
// ---------------------------------------------------------------------------

test.describe("voice input on questionnaire", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_MEDIA_RECORDER_SCRIPT);

    await page.addInitScript(() => {
      localStorage.removeItem("reality-application-draft");
      localStorage.removeItem("researchMode");
      localStorage.setItem("applicationId", "appl_voice_test");
    });

    // Questionnaire GET/POST
    await page.route(
      (url) => {
        const href = url.toString();
        return (
          href.includes("/api/applications/questionnaire") &&
          !href.includes("/audio-upload-url") &&
          !href.includes("/audio-upload-complete")
        );
      },
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
            body: JSON.stringify(QUESTIONNAIRE_RESPONSE),
          });
        } else {
          await route.fulfill({ status: 200, json: { saved: true } });
        }
      },
    );

    await page.route("**/api/applicant/dashboard**", async (route) => {
      await route.fulfill({ status: 401, body: "{}" });
    });
    await page.route("**/api/applicant/application**", async (route) => {
      await route.fulfill({ status: 401, body: "{}" });
    });

    // audio-upload-complete is fire-and-forget from the client
    await page.route(
      "**/api/applications/questionnaire/audio-upload-complete",
      async (route) => {
        await route.fulfill({ status: 200, json: { queued: true } });
      },
    );
  });

  // -------------------------------------------------------------------------

  test("happy path: record → stop → review → save → confirmed banner", async ({
    page,
  }) => {
    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("happy"),
            storagePath: "appl_voice_test/q_voice/1711234567890.webm",
          },
        });
      },
    );
    await routeFakeSupabaseSignedPut(page);

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    // ── Step 1: start recording ──────────────────────────────────────────────
    await expect(voiceAnswerButton(page)).toBeVisible();
    await voiceAnswerButton(page).click();

    // Recording state: timer and Stop button visible
    await expect(
      page.getByRole("button", { name: /stop recording/i }),
    ).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();

    // ── Step 2: stop recording → recorded state ──────────────────────────────
    await page.getByRole("button", { name: /stop recording/i }).click();

    // Recorded state: audio player + Save/Re-record buttons
    await expect(
      page.getByText(/review your recording before saving/i),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: /save recording/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /re-record/i }),
    ).toBeVisible();

    // ── Step 3: save recording → confirmed state ─────────────────────────────
    const uploadUrlRequest = page.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        req.url().includes("/api/applications/questionnaire/audio-upload-url"),
    );

    await page.getByRole("button", { name: /save recording/i }).click();

    await uploadUrlRequest;

    // Confirmed state: copper "Voice recording saved" banner
    await expect(page.getByText(/voice recording saved/i)).toBeVisible({
      timeout: 10000,
    });

    // "Re-record" link still available to replace the recording
    await expect(
      page.getByRole("button", { name: /re-record/i }),
    ).toBeVisible();

    // "Voice answer" idle button is gone
    await expect(voiceAnswerButton(page)).not.toBeVisible();

    // Textarea remains editable alongside the recording
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled();
  });

  // -------------------------------------------------------------------------

  test("required textarea: audio-only answer allows form submission", async ({
    page,
  }) => {
    let savePostCalls = 0;

    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("required"),
            storagePath: "appl_voice_test/q_voice/111.webm",
          },
        });
      },
    );
    await routeFakeSupabaseSignedPut(page);

    // Override questionnaire POST to count save calls
    await page.route("**/api/applications/questionnaire", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: QUESTIONNAIRE_RESPONSE });
      } else {
        savePostCalls += 1;
        await route.fulfill({ status: 200, json: { saved: true } });
      }
    });

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    // Attempt to submit with nothing filled in — should be blocked
    await page.getByRole("button", { name: /save and continue/i }).click();
    await expect(
      page.getByText(/please type an answer or save a voice recording/i),
    ).toBeVisible();
    expect(savePostCalls).toBe(0);

    // Record and confirm audio
    await voiceAnswerButton(page).click();
    await expect(
      page.getByRole("button", { name: /stop recording/i }),
    ).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /stop recording/i }).click();
    await expect(
      page.getByRole("button", { name: /save recording/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /save recording/i }).click();
    await expect(page.getByText(/voice recording saved/i)).toBeVisible({
      timeout: 10000,
    });

    // Now submit — validation should pass (confirmed audio satisfies required)
    await page.getByRole("button", { name: /save and continue/i }).click();
    expect(savePostCalls).toBe(1);
  });

  // -------------------------------------------------------------------------

  test("cancel recording returns to idle without uploading", async ({
    page,
  }) => {
    let uploadUrlCalled = false;
    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        uploadUrlCalled = true;
        await route.fulfill({
          status: 500,
          json: { error: "should not be called" },
        });
      },
    );

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    await voiceAnswerButton(page).click();
    await expect(
      page.getByRole("button", { name: /stop recording/i }),
    ).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: /cancel/i }).click();

    // Back to idle, no upload attempted
    await expect(voiceAnswerButton(page)).toBeVisible({ timeout: 3000 });
    expect(uploadUrlCalled).toBe(false);
  });

  // -------------------------------------------------------------------------

  test("re-record from confirmed resets to idle", async ({ page }) => {
    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("rerecord"),
            storagePath: "appl_voice_test/q_voice/222.webm",
          },
        });
      },
    );
    await routeFakeSupabaseSignedPut(page);

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    // Record and confirm
    await voiceAnswerButton(page).click();
    await page
      .getByRole("button", { name: /stop recording/i })
      .waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: /stop recording/i }).click();
    await page
      .getByRole("button", { name: /save recording/i })
      .waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /save recording/i }).click();
    await expect(page.getByText(/voice recording saved/i)).toBeVisible({
      timeout: 10000,
    });

    // Click "Re-record" → back to idle
    await page.getByRole("button", { name: /re-record/i }).click();
    await expect(voiceAnswerButton(page)).toBeVisible({ timeout: 3000 });
  });

  // -------------------------------------------------------------------------

  test("upload failure shows error and textarea remains editable", async ({
    page,
  }) => {
    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("fail-upload"),
            storagePath: "appl_voice_test/q_voice/333.webm",
          },
        });
      },
    );

    // Make the signed PUT fail
    await page.route("**/*e2e-voice-fake.supabase.co/**", async (route) => {
      await route.fulfill({ status: 500, body: "storage error" });
    });

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    await voiceAnswerButton(page).click();
    await page
      .getByRole("button", { name: /stop recording/i })
      .waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: /stop recording/i }).click();
    await page
      .getByRole("button", { name: /save recording/i })
      .waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /save recording/i }).click();

    // Error state — matches "Failed to upload voice recording. Please try again."
    await expect(page.getByText(/failed to upload/i)).toBeVisible({
      timeout: 10000,
    });

    // Textarea remains usable; user can type instead
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled();
    await textarea.fill("Typed manually after upload failed.");
    await expect(textarea).toHaveValue("Typed manually after upload failed.");

    // "Try again" resets to idle
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(voiceAnswerButton(page)).toBeVisible();
  });

  // -------------------------------------------------------------------------

  test("microphone permission denied shows error message", async ({ page }) => {
    await page.addInitScript(`
      navigator.mediaDevices.getUserMedia = async () => {
        const err = new DOMException('Permission denied', 'NotAllowedError');
        throw err;
      };
    `);

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    await voiceAnswerButton(page).click();

    await expect(page.getByText(/microphone access was denied/i)).toBeVisible({
      timeout: 3000,
    });

    // Textarea stays usable
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled();
  });
});
