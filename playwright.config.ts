import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: isCI ? "npm run start -- --port 3000" : "npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
