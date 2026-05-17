// Cloudflare Web Analytics — privacy-friendly, no cookies, no GDPR banner
// required. To enable: in Cloudflare Dashboard → Web Analytics → Add Site
// → pick "free, with JS snippet" → copy the `token` (a 32-char hex). Set
// `VITE_CF_BEACON_TOKEN=<token>` in Cloudflare Pages env (Production + Preview)
// and redeploy. Until that env is present this is a no-op.
//
// We inject the script tag at runtime instead of hardcoding it in index.html
// so the token never has to be committed to the repo.

let injected = false;

export function initAnalytics() {
  if (injected || typeof document === 'undefined') return;
  const token = import.meta.env.VITE_CF_BEACON_TOKEN;
  if (!token) return;

  // Defer injection until idle so the analytics beacon doesn't block paint.
  const inject = () => {
    if (injected) return;
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    document.head.appendChild(s);
    injected = true;
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(inject, { timeout: 2000 });
  } else {
    window.setTimeout(inject, 1500);
  }
}
