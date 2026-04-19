/** Format integer cents as Dominican Peso display (no locale-specific grouping). */
export function formatDopFromCents(cents) {
	if (cents == null || cents === '') {
		return '';
	}
	const n = Number(cents);
	if (Number.isNaN(n)) {
		return '';
	}
	return `RD$${(n / 100).toFixed(2)}`;
}
