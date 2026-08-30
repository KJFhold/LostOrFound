import * as Sentry from "@sentry/react-native";

const SENSITIVE_KEYS = [
  "authorization",
  "access_token",
  "refresh_token",
  "token",
  "password",
  "email",
  "address",
  "location_label",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "description",
  "message",
  "body",
];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(source)) {
    const normalized = key.toLowerCase();
    result[key] = SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive))
      ? "[Filtered]"
      : redact(child);
  }

  return result;
}

export function initializeSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (__DEV__) console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN is not configured.");
    return;
  }

  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "preview"),
    sendDefaultPii: false,
    enableLogs: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        event.request = redact(event.request) as typeof event.request;
      }
      if (event.contexts) {
        event.contexts = redact(event.contexts) as typeof event.contexts;
      }
      if (event.extra) {
        event.extra = redact(event.extra) as typeof event.extra;
      }
      if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : undefined;
      }
      return event;
    },
  });
}

export { Sentry };
