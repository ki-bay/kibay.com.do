// Defaults match the seed values in the shipping_rates table — used as a
// fallback if the DB fetch fails so checkout never shows $0 shipping by
// accident. In normal operation, CheckoutPage fetches the live rates and
// passes them to computeShippingMajor.
const DEFAULT_TIERS = {
	DOP: { freeOver: 5000, express: 400, standard: 200 },
	USD: { freeOver: 90, express: 8, standard: 4 },
};

/**
 * Shipping cost in major currency units.
 * @param {number} subtotalMajor
 * @param {'standard' | 'express'} method
 * @param {'DOP' | 'USD'} [currency='DOP']
 * @param {Record<string, {freeOver: number, standard: number, express: number}>} [tiers]
 *   Optional override (typically loaded from the shipping_rates table). Same
 *   shape as DEFAULT_TIERS, in major units.
 * @returns {number}
 */
export function computeShippingMajor(subtotalMajor, method, currency = 'DOP', tiers) {
	const source = tiers && Object.keys(tiers).length ? tiers : DEFAULT_TIERS;
	const tier = source[String(currency).toUpperCase()] || DEFAULT_TIERS.DOP;
	if (subtotalMajor >= tier.freeOver) return 0;
	return method === 'express' ? tier.express : tier.standard;
}

/**
 * Convert the row shape returned by the shipping_rates table (cents columns)
 * into the major-units shape computeShippingMajor expects.
 */
export function tiersFromShippingRates(rows) {
	const out = {};
	for (const row of rows || []) {
		if (!row?.currency) continue;
		out[row.currency] = {
			freeOver: (Number(row.free_over_cents) || 0) / 100,
			standard: (Number(row.standard_cents) || 0) / 100,
			express: (Number(row.express_cents) || 0) / 100,
		};
	}
	return out;
}
