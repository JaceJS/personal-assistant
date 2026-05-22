import * as Sentry from "@sentry/react-native";

type LogContext = Record<string, unknown>;

export const logger = {
  debug: (msg: string, ctx?: LogContext) => {
    if (__DEV__) console.log(`[DEBUG] ${msg}`, ctx ?? "");
  },

  info: (msg: string, ctx?: LogContext) => {
    if (__DEV__) console.log(`[INFO] ${msg}`, ctx ?? "");
    else Sentry.addBreadcrumb({ message: msg, data: ctx, level: "info" });
  },

  warn: (msg: string, ctx?: LogContext) => {
    if (__DEV__) console.warn(`[WARN] ${msg}`, ctx ?? "");
    else Sentry.addBreadcrumb({ message: msg, data: ctx, level: "warning" });
  },

  error: (msg: string, error?: unknown, ctx?: LogContext) => {
    if (__DEV__) console.error(`[ERROR] ${msg}`, error, ctx ?? "");
    else
      Sentry.captureException(error ?? new Error(msg), {
        extra: { msg, ...ctx },
      });
  },

  // User identity for error context — userId only, no PII (email, name, etc.)
  identifyUser: (userId: string) => {
    Sentry.setUser({ id: userId });
  },

  resetUser: () => {
    Sentry.setUser(null);
  },
};
