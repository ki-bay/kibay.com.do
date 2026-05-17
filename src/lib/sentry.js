// Sentry initialization — no-op until VITE_SENTRY_DSN is set in env. This
// means the SDK ships in the bundle but does nothing during local dev or
// before the owner creates a Sentry project. To enable:
//
//   1. https://sentry.io/signup/ — create a project, type "React".
//   2. Copy the DSN (looks like `https://<key>@o<org>.ingest.sentry.io/<proj>`).
//   3. Set `VITE_SENTRY_DSN=<dsn>` in Cloudflare Pages env (Production + Preview).
//   4. Optional: `VITE_SENTRY_TRACES_SAMPLE_RATE=0.1` (10% perf samples).
//   5. Redeploy.

let initialized = false;
let sentryRef = null;

export async function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // not configured — stay silent

  try {
    const Sentry = await import('@sentry/react');
    sentryRef = Sentry;
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || 'production',
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0,
      // Don't send PII automatically. Order details are server-side anyway.
      sendDefaultPii: false,
      // Common noisy errors to drop — extension-injected scripts, abort errors
      // from canceled fetches, etc.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'AbortError',
      ],
    });
    initialized = true;
  } catch (e) {
    // Sentry import failing should never break the app.
    console.warn('Sentry init failed (non-fatal):', e);
  }
}

// Forward a manually caught error / unhandled render error to Sentry. Falls
// back to a no-op when Sentry isn't initialized.
export function reportError(error, context) {
  if (!sentryRef) return;
  try {
    sentryRef.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* swallow */
  }
}
