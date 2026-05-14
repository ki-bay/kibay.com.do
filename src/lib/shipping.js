// Logistics-grade shipping for Kibay (DR).
//
// Three methods at checkout:
//   'standard'  → Vimenpaq/Domex 2-3 days, per-bottle scaling with bulk cap
//   'express'   → Vimenpaq priority 24h, = standard + flat surcharge
//   'pickup'    → Recogida en bodega Ocoa Bay, always free
//
// Bottle-count math (Estándar, DOP):
//   1 bottle             RD$250
//   Bottles 2-11         +RD$80 each
//   12+ bottles (bulk)   RD$1,400 flat
//   Subtotal ≥ RD$5,000  → Estándar free, Express still pays the surcharge
//
// USD tier mirrors at ~60 DOP/USD ($4.50 base, +$1.50 each, $24 bulk, $90 free).
//
// Experiences (excursions, day passes) DO NOT contribute to bottleCount — the
// caller filters them out before calling.

const DEFAULT_TIERS = {
	DOP: {
		standard: 250,
		express: 450,
		perAdditional: 80,
		bulkThreshold: 12,
		bulkPrice: 1400,
		freeOver: 5000,
	},
	USD: {
		standard: 4.5,
		express: 8,
		perAdditional: 1.5,
		bulkThreshold: 12,
		bulkPrice: 24,
		freeOver: 90,
	},
};

/**
 * Shipping cost in major currency units.
 * @param {number} bottleCount Sum of qty across cart items where
 *   product.type !== 'experience'. Pass 0 for experience-only carts.
 * @param {'standard'|'express'|'pickup'} method
 * @param {'DOP'|'USD'} [currency='DOP']
 * @param {object} [tiers] Optional override loaded from shipping_rates.
 * @param {number} [subtotalMajor=0] Cart subtotal in major units (used for
 *   free-shipping threshold). Pass 0 to disable the free-shipping check.
 * @returns {number}
 */
export function computeShippingMajor(bottleCount, method, currency = 'DOP', tiers, subtotalMajor = 0) {
	// Pickup at the winery is always free.
	if (method === 'pickup') return 0;

	const count = Math.max(0, Math.floor(Number(bottleCount) || 0));
	if (count === 0) return 0;

	const source = tiers && Object.keys(tiers).length ? tiers : DEFAULT_TIERS;
	const tier = source[String(currency).toUpperCase()] || DEFAULT_TIERS.DOP;

	const expressSurcharge = Number(tier.express || 0) - Number(tier.standard || 0);

	// Free shipping over subtotal threshold. Estándar becomes 0; Express still
	// pays the express surcharge (= express_base − standard_base).
	const freeOver = Number.isFinite(tier.freeOver) && tier.freeOver > 0 ? tier.freeOver : Infinity;
	if (Number(subtotalMajor) >= freeOver) {
		if (method === 'express') return Math.max(0, expressSurcharge);
		return 0;
	}

	const threshold = Number.isFinite(tier.bulkThreshold) && tier.bulkThreshold > 0
		? tier.bulkThreshold : Infinity;
	const bulkPrice = Number.isFinite(tier.bulkPrice) && tier.bulkPrice > 0
		? tier.bulkPrice : null;

	// 12+ bottles: flat bulk price. Express adds the surcharge.
	if (count >= threshold && bulkPrice != null) {
		return method === 'express' ? bulkPrice + expressSurcharge : bulkPrice;
	}

	const base = method === 'express' ? tier.express : tier.standard;
	const per = Number.isFinite(tier.perAdditional) ? tier.perAdditional : 0;
	return base + (count - 1) * per;
}

/**
 * Convert shipping_rates DB rows (cents columns) into the major-units shape
 * computeShippingMajor expects.
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
			freeOver: (Number(row.free_over_cents) || 0) / 100,
		};
	}
	return out;
}
