// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://16a7fc6b7a2fd188acb178edd91dbd30@o4510999368630272.ingest.us.sentry.io/4510999370334208",

  // Performance Monitoring — sample 20% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Do not send PII — we redact PII in our logger and should do the same here
  sendDefaultPii: false,
});
