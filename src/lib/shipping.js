// Per-bottle shipping with a bulk-order jump. Experience products
// (excursions, day passes) do NOT contribute to the count — the caller
// passes only the shippable bottle count (sum of qty across type=physical
// cart items).
//
// Brand policy (DOP):
//   Bottle 1            → RD$200 standard, RD$400 express
//   Bottles 2-11        → previous + RD$100 each additional
//   Bottles 12+ (bulk)  → RD$1,600 flat, regardless of method
// USD tier uses the same shape converted at ~60 DOP/USD.
const DEFAULT_TIERS = {
	DOP: { standard: 200, express: 400, perAdditional: 100, bulkThreshold: 12, bulkPrice: 1600 },
	USD: { standard: 4, express: 8, perAdditional: 2, bulkThreshold: 12, bulkPrice: 30 },
};

/**
 * Shipping cost in major currency units.
 * @param {number} bottleCount Number of shippable bottles (sum of variant qty
 *   over physical-type products only — experiences contribute 0). Pass 0 if
 *   the cart has nothing to ship → returns 0.
 * @param {'standard' | 'express'} method
 * @param {'DOP' | 'USD'} [currency='DOP']
 * @param {Record<string, {standard:number,express:number,perAdditional:number,bulkThreshold:number,bulkPrice:number}>} [tiers]
 *   Optional override loaded from shipping_rates. Same shape as DEFAULT_TIERS,
 *   in major units.
 * @returns {number}
 */
export function computeShippingMajor(bottleCount, method, currency = 'DOP', tiers) {
	const count = Math.max(0, Math.floor(Number(bottleCount) || 0));
	if (count === 0) return 0;

	const source = tiers && Object.keys(tiers).length ? tiers : DEFAULT_TIERS;
	const tier = source[String(currency).toUpperCase()] || DEFAULT_TIERS.DOP;

	const threshold = Number.isFinite(tier.bulkThreshold) && tier.bulkThreshold > 0
		? tier.bulkThreshold : Infinity;
	const bulkPrice = Number.isFinite(tier.bulkPrice) && tier.bulkPrice > 0
		? tier.bulkPrice : null;

	if (count >= threshold && bulkPrice != null) return bulkPrice;

	const base = method === 'express' ? tier.express : tier.standard;
	const per = Number.isFinite(tier.perAdditional) ? tier.perAdditional : 0;
	return base + (count - 1) * per;
}

/**
 * Convert the row shape returned by shipping_rates (cents columns) into the
 * major-units shape computeShippingMajor expects.
 */
export function tiersFromShippingRates(rows) {
	const out = {};
	for (const row of rows || []) {
		if (!row?.currency) continue;
		out[row.currency] = {
			standard: (Number(row.standard_cents) || 0) / 100,
			express: (Number(row.express_cents) || 0) / 100,
			perAdditional: (Number(row.per_additional_cents) || 0) / 100,
			bulkThreshold: Number(row.bulk_threshold_count) || 0,
			bulkPrice: (Number(row.max_cents) || 0) / 100,
		};
	}
	return out;
}
