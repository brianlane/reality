type DebugRuntimePayload = {
  sessionId?: string;
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
};

const DEBUG_RUNTIME_LOG_ENABLED =
  process.env.DEBUG_RUNTIME_LOG_ENABLED === "true";
const DEBUG_RUNTIME_LOG_ENDPOINT = process.env.DEBUG_RUNTIME_LOG_ENDPOINT;
const DEBUG_RUNTIME_LOG_SESSION_ID = process.env.DEBUG_RUNTIME_LOG_SESSION_ID;

export function emitDebugRuntimeLog(payload: DebugRuntimePayload): void {
  if (!DEBUG_RUNTIME_LOG_ENABLED || !DEBUG_RUNTIME_LOG_ENDPOINT) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (DEBUG_RUNTIME_LOG_SESSION_ID) {
    headers["X-Debug-Session-Id"] = DEBUG_RUNTIME_LOG_SESSION_ID;
  }

  const body =
    DEBUG_RUNTIME_LOG_SESSION_ID && !payload.sessionId
      ? { ...payload, sessionId: DEBUG_RUNTIME_LOG_SESSION_ID }
      : payload;

  fetch(DEBUG_RUNTIME_LOG_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).catch(() => {});
}
