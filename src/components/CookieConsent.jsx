import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'kibay_cookie_consent_v1';

const CookieConsent = () => {
	const { t } = useTranslation('cookieConsent');
	const [show, setShow] = useState(false);

	useEffect(() => {
		try {
			if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
		} catch {
			/* SSR / private mode — ignore */
		}
	}, []);

	const accept = () => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, at: Date.now() }));
		} catch { /* ignore */ }
		setShow(false);
	};
	const decline = () => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, at: Date.now() }));
		} catch { /* ignore */ }
		setShow(false);
	};

	if (!show) return null;
	return (
		<div
			role="dialog"
			aria-live="polite"
			aria-label={t('ariaLabel')}
			className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[60] bg-card border border-foreground/10 rounded-2xl shadow-xl p-5"
		>
			<p className="text-sm text-foreground/80 leading-relaxed mb-4">
				{t('message')}{' '}
				<Link to="/privacy" className="underline hover:text-mango-400">
					{t('privacyPolicy')}
				</Link>
				.
			</p>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={accept}
					className="flex-1 px-4 py-2 rounded-full bg-mango-500 hover:bg-mango-600 text-white text-sm font-medium"
				>
					{t('accept')}
				</button>
				<button
					type="button"
					onClick={decline}
					className="px-4 py-2 rounded-full border border-foreground/15 hover:bg-foreground/5 text-foreground/70 text-sm font-light"
				>
					{t('decline')}
				</button>
			</div>
		</div>
	);
};

export default CookieConsent;
