/**
 * Shipping in major currency units (same as getCartTotal: e.g. RD$).
 * @param {number} subtotalMajor
 * @param {'standard' | 'express'} method
 * @returns {number}
 */
export function computeShippingMajor(subtotalMajor, method) {
	const freeOver = 5000;
	if (subtotalMajor >= freeOver) {
		return 0;
	}
	return method === 'express' ? 400 : 200;
}
