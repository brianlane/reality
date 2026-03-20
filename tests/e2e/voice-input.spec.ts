/**
 * E2E tests for the VoiceTextareaInput component integrated into the
 * questionnaire page. Real microphone / Supabase storage are not needed:
 *
 * • navigator.mediaDevices.getUserMedia  is replaced by an initScript that
 *   returns a fake MediaStream whose tracks can be stopped.
 * • MediaRecorder                        is replaced by a fake that emits a
 *   synthetic dataavailable event (4 bytes of fake audio) and then stop.
 * • All backend routes (audio-upload-url, signed PUT, voice-status, the
 *   questionnaire GET/POST) are intercepted via page.route().
 */

import { expect, test, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Browser-side stubs injected before any page script runs
// ---------------------------------------------------------------------------

const FAKE_MEDIA_RECORDER_SCRIPT = `
  (() => {
    // Fake MediaStream track
    function makeFakeStream() {
      return { getTracks: () => [{ stop: () => {} }] };
    }

    // Override getUserMedia so no microphone permission prompt appears
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: async () => makeFakeStream(),
      },
    });

    // Fake MediaRecorder
    class FakeMediaRecorder {
      constructor(stream, opts) {
        this._mimeType = (opts && opts.mimeType) ? opts.mimeType : 'audio/webm';
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
        this._stopTimeout = null;
      }

      get mimeType() { return this._mimeType; }

      start(timeslice) {
        this.state = 'recording';
        // Emit one synthetic chunk immediately so chunksRef is non-empty
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
        // Fire onstop after a short delay (mirrors real MediaRecorder behaviour)
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
// Voice control: prefer text matching because role+name can be flaky when the
// label mixes SVG (aria-hidden) + visible text in some Chromium builds.
function voiceAnswerButton(page: Page) {
  return page.locator("button").filter({ hasText: /^Voice answer$/i });
}

// Shared questionnaire mock payload (includes one TEXTAREA question)
// ---------------------------------------------------------------------------

const QUESTIONNAIRE_RESPONSE = {
  // Explicitly no paged questionnaire: if `pages` is non-empty, sections must carry
  // matching `pageId` or the client filters them all out.
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

// CSP connect-src only allows https://*.supabase.co (plus a few other hosts).
// A fake example.com storage URL is blocked, so uploadAudio's fetch throws and
// the UI shows a generic unexpected error.
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
// Tests
// ---------------------------------------------------------------------------

test.describe("voice input on questionnaire", () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake MediaRecorder + getUserMedia before any page JS runs
    await page.addInitScript(FAKE_MEDIA_RECORDER_SCRIPT);

    // Pretend the user already has an applicationId in localStorage
    await page.addInitScript(() => {
      // Stale draft can override applicationId / currentPageId and cause the client
      // to filter sections incorrectly or load the wrong questionnaire shape.
      localStorage.removeItem("reality-application-draft");
      localStorage.removeItem("researchMode");
      localStorage.setItem("applicationId", "appl_voice_test");
    });

    // Mock questionnaire load
    await page.route(
      (url) => {
        const href = url.toString();
        return (
          href.includes("/api/applications/questionnaire") &&
          !href.includes("/voice-status") &&
          !href.includes("/audio-upload-url")
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

    // Avoid touching real applicant session during E2E (can overwrite applicationId).
    await page.route("**/api/applicant/dashboard**", async (route) => {
      await route.fulfill({ status: 401, body: "{}" });
    });

    // ResearchRouteGuard may call this when researchMode is stale in storage.
    await page.route("**/api/applicant/application**", async (route) => {
      await route.fulfill({ status: 401, body: "{}" });
    });

    // Manual fallback trigger route (non-fatal in client flow).
    await page.route(
      "**/api/applications/questionnaire/audio-upload-complete",
      async (route) => {
        await route.fulfill({ status: 200, json: { queued: true } });
      },
    );
  });

  test("happy path: record → upload → transcribed → Use as answer populates textarea", async ({
    page,
  }) => {
    let voiceStatusCallCount = 0;

    // audio-upload-url: returns a fake signed URL + storagePath
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

    // Signed PUT to mocked Supabase Storage — always succeeds
    await routeFakeSupabaseSignedPut(page);

    // voice-status: first call returns "processing", second returns "transcribed"
    await page.route(
      "**/api/applications/questionnaire/voice-status**",
      async (route) => {
        voiceStatusCallCount += 1;
        if (voiceStatusCallCount === 1) {
          await route.fulfill({
            status: 200,
            json: {
              voiceStatus: "processing",
              voiceTranscript: null,
              voiceTranscribedAt: null,
              voiceProvider: null,
              voiceErrorCode: null,
            },
          });
        } else {
          await route.fulfill({
            status: 200,
            json: {
              voiceStatus: "transcribed",
              voiceTranscript:
                "I am passionate about building meaningful connections.",
              voiceTranscribedAt: new Date().toISOString(),
              voiceProvider: "groq",
              voiceErrorCode: null,
            },
          });
        }
      },
    );

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    // ── Step 1: start recording ──────────────────────────────────────────────
    const voiceBtn = voiceAnswerButton(page);
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();

    // Recording state: timer counter and Stop button should appear
    await expect(
      page.getByRole("button", { name: /stop & transcribe/i }),
    ).toBeVisible({ timeout: 3000 });

    // ── Step 2: stop recording → triggers upload ─────────────────────────────
    const uploadAudioPromise = page.waitForRequest((req) => {
      return (
        req.method() === "POST" &&
        req.url().includes("/api/applications/questionnaire/audio-upload-url")
      );
    });

    await page.getByRole("button", { name: /stop & transcribe/i }).click();

    await uploadAudioPromise;

    // ── Step 3: processing state (after upload finishes) ─────────────────────
    await expect(page.getByText(/transcribing your voice answer/i)).toBeVisible(
      { timeout: 10000 },
    );

    // ── Step 4: transcript panel appears ─────────────────────────────────────
    // The poller fires every 2500ms; give it plenty of time
    await expect(page.getByText(/voice transcript ready/i)).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByText("I am passionate about building meaningful connections."),
    ).toBeVisible();

    // ── Step 5: "Use as answer" copies transcript into textarea ───────────────
    await page.getByRole("button", { name: /use as answer/i }).click();

    const textarea = page.locator("textarea").first();
    await expect(textarea).toHaveValue(
      "I am passionate about building meaningful connections.",
    );

    // Transcript panel should be dismissed and voice UI should return to idle
    await expect(page.getByText(/voice transcript ready/i)).not.toBeVisible();
    await expect(voiceAnswerButton(page)).toBeVisible();
  });

  test("required textarea is still validated during voice processing", async ({
    page,
  }) => {
    let savePostCalls = 0;

    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("pending"),
            storagePath: "appl_voice_test/q_voice/1711234567890.webm",
          },
        });
      },
    );

    await routeFakeSupabaseSignedPut(page);

    await page.route(
      "**/api/applications/questionnaire/voice-status**",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            voiceStatus: "processing",
            voiceTranscript: null,
            voiceTranscribedAt: null,
            voiceProvider: null,
            voiceErrorCode: null,
          },
        });
      },
    );

    // Track save attempts; should remain 0 when required validation blocks submit.
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

    await voiceAnswerButton(page).click();
    await page.getByRole("button", { name: /stop & transcribe/i }).click();

    await expect(page.getByText(/transcribing your voice answer/i)).toBeVisible(
      { timeout: 5000 },
    );

    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(
      page.getByText(/please fix the highlighted errors before continuing/i),
    ).toBeVisible();
    await expect(page.getByText("This field is required.")).toBeVisible();
    expect(savePostCalls).toBe(0);
  });

  test("failed transcription: shows error and textarea remains editable", async ({
    page,
  }) => {
    // audio-upload-url succeeds
    await page.route(
      "**/api/applications/questionnaire/audio-upload-url",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            signedUrl: e2eFakeSignedPutUrl("fail"),
            storagePath: "appl_voice_test/q_voice/1711234567890.webm",
          },
        });
      },
    );
    await routeFakeSupabaseSignedPut(page);

    // voice-status immediately returns "failed"
    await page.route(
      "**/api/applications/questionnaire/voice-status**",
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            voiceStatus: "failed",
            voiceTranscript: null,
            voiceTranscribedAt: null,
            voiceProvider: null,
            voiceErrorCode: "groq_timeout",
          },
        });
      },
    );

    await page.goto("/apply/questionnaire");
    await page.waitForLoadState("networkidle");

    await voiceAnswerButton(page).click();
    await expect(
      page.getByRole("button", { name: /stop & transcribe/i }),
    ).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /stop & transcribe/i }).click();

    // Error message should appear
    await expect(page.getByText(/voice transcription failed/i)).toBeVisible({
      timeout: 15000,
    });

    // Textarea remains enabled so the user can still type manually
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled();
    await textarea.fill("Typed manually after voice failed.");
    await expect(textarea).toHaveValue("Typed manually after voice failed.");

    // "Try again" resets to idle
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(voiceAnswerButton(page)).toBeVisible();
  });

  test("cancel recording discards audio and returns to idle", async ({
    page,
  }) => {
    // audio-upload-url should NOT be called when recording is cancelled
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
      page.getByRole("button", { name: /stop & transcribe/i }),
    ).toBeVisible({ timeout: 3000 });

    // Cancel immediately
    await page.getByRole("button", { name: /cancel/i }).click();

    // Back to idle; no upload was attempted
    await expect(voiceAnswerButton(page)).toBeVisible({ timeout: 3000 });
    expect(uploadUrlCalled).toBe(false);
  });

  test("microphone permission denied shows VOICE_PERMISSION_DENIED message", async ({
    page,
  }) => {
    // Override the fake getUserMedia installed in beforeEach to throw NotAllowedError
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
