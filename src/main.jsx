import React from 'react';
import ReactDOM from 'react-dom/client';

// Auto-recover from stale-chunk errors after a deploy. When a dynamic import
// fails (Vite emits 'vite:preloadError' / a generic Failed-to-fetch-module),
// the user's old index.html is referencing chunk hashes that no longer exist.
// Force a single full reload so they pick up the new HTML + chunk graph.
const RELOAD_KEY = 'kibay_chunk_reload_at';
function tryStaleChunkReload(reason) {
	try {
		const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
		// Don't loop: only reload if we haven't already reloaded in the last 30s.
		if (Date.now() - last < 30_000) return;
		sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
		console.warn('Stale chunk detected — reloading. Reason:', reason);
		window.location.reload();
	} catch {
		/* ignore */
	}
}
if (typeof window !== 'undefined') {
	window.addEventListener('vite:preloadError', (e) => tryStaleChunkReload(e?.payload || 'preloadError'));
	window.addEventListener('error', (e) => {
		const msg = e?.message || '';
		if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
			tryStaleChunkReload(msg);
		}
	});
	window.addEventListener('unhandledrejection', (e) => {
		const msg = e?.reason?.message || String(e?.reason || '');
		if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
			tryStaleChunkReload(msg);
		}
	});
}
import { ThemeProvider } from 'next-themes';
import { LazyMotion, domAnimation } from 'framer-motion';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/index.css';
import '@/i18n';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { CartProvider } from '@/hooks/useCart';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="kibay_theme">
    <AuthProvider>
      <CartProvider>
        <ErrorBoundary>
          <LazyMotion features={domAnimation} strict>
            <App />
          </LazyMotion>
        </ErrorBoundary>
        <Toaster />
        <SonnerToaster />
      </CartProvider>
    </AuthProvider>
  </ThemeProvider>
);
