// Localized currency + date formatters. Use these instead of toLocaleDateString
// or string concatenation so es-DO and en-US users see numbers and dates the
// way they expect (decimal vs comma separators, dd/mm vs mm/dd).

const localeForLang = (lang) => (String(lang || 'es').slice(0, 2) === 'en' ? 'en-US' : 'es-DO');

/**
 * Format a price stored as cents into the user's locale, with the right symbol.
 * Falls back to a simple `${symbol}${amount}` if Intl barfs (it shouldn't).
 */
export function formatMoney(cents, currency = 'DOP', lang) {
	const amount = (Number(cents) || 0) / 100;
	try {
		return new Intl.NumberFormat(localeForLang(lang), {
			style: 'currency',
			currency: currency === 'USD' ? 'USD' : 'DOP',
			currencyDisplay: 'narrowSymbol',
		}).format(amount);
	} catch {
		const symbol = currency === 'USD' ? '$' : 'RD$';
		return `${symbol}${amount.toFixed(2)}`;
	}
}

/** Date in the user's locale (medium length: "May 9, 2026" / "9 may 2026"). */
export function formatDate(input, lang) {
	if (!input) return '';
	const d = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(d.getTime())) return '';
	try {
		return new Intl.DateTimeFormat(localeForLang(lang), {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		}).format(d);
	} catch {
		return d.toISOString().slice(0, 10);
	}
}

/** Date + time. */
export function formatDateTime(input, lang) {
	if (!input) return '';
	const d = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(d.getTime())) return '';
	try {
		return new Intl.DateTimeFormat(localeForLang(lang), {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(d);
	} catch {
		return d.toISOString().slice(0, 16).replace('T', ' ');
	}
}
