/**
 * Structured Logger with PII Redaction
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Payment failed', { error, paymentId });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

// Sensitive field patterns to redact
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "creditCard",
  "ssn",
  "email", // Optionally redact email in logs
  "phone",
];

function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key matches sensitive pattern
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field.toLowerCase()),
    );

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const redactedContext = context ? redactSensitiveData(context) : {};

  const logEntry = {
    timestamp,
    level,
    message,
    ...(Object.keys(redactedContext).length > 0 && { context: redactedContext }),
    environment: process.env.NODE_ENV || "development",
  };

  return JSON.stringify(logEntry);
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = process.env.LOG_LEVEL || "info";

  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const minLevelIndex = levels.indexOf(minLevel as LogLevel);
  const currentLevelIndex = levels.indexOf(level);

  return currentLevelIndex >= minLevelIndex;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) {
      // In development, use console for better DX
      if (process.env.NODE_ENV === "development") {
        console.debug(`[DEBUG] ${message}`, context || "");
      } else {
        console.log(formatLog("debug", message, context));
      }
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog("info")) {
      if (process.env.NODE_ENV === "development") {
        console.info(`[INFO] ${message}`, context || "");
      } else {
        console.log(formatLog("info", message, context));
      }
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[WARN] ${message}`, context || "");
      } else {
        console.warn(formatLog("warn", message, context));
      }
    }
  },

  error(message: string, context?: LogContext) {
    if (shouldLog("error")) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${message}`, context || "");
      } else {
        console.error(formatLog("error", message, context));
      }
    }
  },
};

export default logger;
