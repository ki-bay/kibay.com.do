// Tier amounts are in major units of the cart currency. USD values are rough
// equivalents of the DOP tiers at ~1 USD ≈ 60 DOP — adjust if real rates shift.
const TIERS = {
	DOP: { freeOver: 5000, express: 400, standard: 200 },
	USD: { freeOver: 90, express: 8, standard: 4 },
};

/**
 * Shipping in major currency units (same as getCartTotal).
 * @param {number} subtotalMajor
 * @param {'standard' | 'express'} method
 * @param {'DOP' | 'USD'} [currency='DOP']
 * @returns {number}
 */
export function computeShippingMajor(subtotalMajor, method, currency = 'DOP') {
	const tier = TIERS[String(currency).toUpperCase()] || TIERS.DOP;
	if (subtotalMajor >= tier.freeOver) return 0;
	return method === 'express' ? tier.express : tier.standard;
}
