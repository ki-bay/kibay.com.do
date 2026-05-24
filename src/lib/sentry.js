// Sentry initialization. DSN is intentionally hardcoded as a fallback —
// Sentry DSNs are public by design (they end up in the browser JS bundle
// regardless of how they're delivered) and Sentry rate-limits per-DSN, so
// there's no value in treating it as a secret. Setting VITE_SENTRY_DSN in
// env overrides the hardcoded value (useful if we ever spin up a second
// Sentry project for preview deploys).

const KIBAY_PRODUCTION_DSN =
  'https://09c5b62bec647b401a1fdad794acce52@o4511407614787584.ingest.us.sentry.io/4511407631433728';

let initialized = false;
let sentryRef = null;

export async function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN || KIBAY_PRODUCTION_DSN;
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
        // Stale-chunk reloads — main.jsx auto-recovers via window.location.reload,
        // so the user sees no breakage. The pre-recovery error is noise.
        'Failed to fetch dynamically imported module',
        'Importing a module script failed',
      ],
    });
    // Expose the namespace so we can fire test events from DevTools and so
    // any other module can call Sentry.captureException() without re-importing.
    if (typeof window !== 'undefined') {
      window.Sentry = Sentry;
    }
    console.log('[sentry] initialized');
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
