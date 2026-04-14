/**
 * Monitoring module — structured error capture with optional Sentry integration.
 *
 * Sentry is loaded dynamically at startup when SENTRY_DSN is set.
 * Without the env var the module is a no-op and has zero overhead.
 *
 * To enable Sentry in production:
 *   1. pnpm --filter @sparfuchs/api add @sentry/node
 *   2. Set SENTRY_DSN in Railway environment variables
 */

type SentryClient = {
  captureException: (err: unknown, context?: Record<string, unknown>) => string;
  captureMessage: (msg: string, level?: "info" | "warning" | "error") => string;
};

let sentry: SentryClient | null = null;
let initialized = false;

export async function initMonitoring(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log("[monitoring] SENTRY_DSN not set — error tracking disabled.");
    return;
  }

  try {
    // Dynamic import so @sentry/node is optional: the app runs fine without it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = await import("@sentry/node" as any);
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
    sentry = Sentry as SentryClient;
    console.log("[monitoring] Sentry initialized.");
  } catch {
    console.warn("[monitoring] @sentry/node not installed — running without Sentry.");
  }
}

/**
 * Capture an unhandled exception. Always logs to stderr; also forwards to
 * Sentry when configured.
 */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[monitoring] Exception captured:", message, context ?? "");
  sentry?.captureException(err, context);
}

/**
 * Capture a diagnostic message (non-error). Logs at info level; also
 * forwards to Sentry when configured.
 */
export function captureMessage(
  msg: string,
  level: "info" | "warning" | "error" = "info",
): void {
  console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](
    `[monitoring] ${msg}`,
  );
  sentry?.captureMessage(msg, level);
}
