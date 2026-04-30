// Catalog API — backed by Supabase tables:
//   products, product_variants, product_images, product_collections,
//   product_collection_assignments, product_additional_info.
//
// Bilingual: each text column has _es / _en variants, each variant has
// price_usd_cents and price_dop_cents. Returned shape adapts to current i18n
// language (es → DOP, en → USD) so consumers don't need currency logic.

import supabase from '@/lib/customSupabaseClient';
import i18n from '@/i18n';

// ---------------------------------------------------------------------------
// Language / currency helpers
// ---------------------------------------------------------------------------

function currentLang() {
	const lang = (i18n?.resolvedLanguage || i18n?.language || 'es').slice(0, 2);
	return lang === 'en' ? 'en' : 'es';
}

function currentCurrency() {
	return currentLang() === 'en' ? 'USD' : 'DOP';
}

function pickCurrency(currency) {
	if (currency === 'USD' || currency === 'DOP') return currency;
	return currentCurrency();
}

function pickLang(lang) {
	if (lang === 'es' || lang === 'en') return lang;
	return currentLang();
}

const CURRENCY_INFO = {
	USD: { code: 'usd', symbol: '$', symbol_native: '$', name: 'US Dollar', name_plural: 'US dollars', decimal_digits: 2, rounding: 0, template: '$$1', min_amount: 100 },
	DOP: { code: 'dop', symbol: 'RD$', symbol_native: 'RD$', name: 'Dominican Peso', name_plural: 'Dominican pesos', decimal_digits: 2, rounding: 0, template: 'RD$$1', min_amount: 100 },
};

export const formatCurrency = (priceInCents, currencyOrInfo) => {
	if (priceInCents === null || priceInCents === undefined) return '';
	let symbol = '$';
	if (typeof currencyOrInfo === 'string') {
		const info = CURRENCY_INFO[currencyOrInfo.toUpperCase()];
		if (info) symbol = info.symbol;
	} else if (currencyOrInfo && typeof currencyOrInfo === 'object') {
		symbol = currencyOrInfo.symbol || currencyOrInfo.code || '$';
	} else {
		symbol = CURRENCY_INFO[currentCurrency()].symbol;
	}
	const amount = (priceInCents / 100).toFixed(2);
	return `${symbol}${amount}`;
};

// ---------------------------------------------------------------------------
// Mappers — Supabase row → public API shape (kept compatible with old Hostinger shape)
// ---------------------------------------------------------------------------

function mapVariant(v, lang, currency) {
	const price_in_cents = currency === 'DOP' ? v.price_dop_cents : v.price_usd_cents;
	const sale_price_in_cents = currency === 'DOP' ? v.sale_price_dop_cents : v.sale_price_usd_cents;
	return {
		id: v.id,
		title: lang === 'en' ? v.title_en : v.title_es,
		image_url: v.image_url ?? null,
		sku: v.sku ?? null,
		price_in_cents,
		sale_price_in_cents,
		currency,
		currency_info: CURRENCY_INFO[currency],
		price_formatted: formatCurrency(price_in_cents, currency),
		sale_price_formatted: formatCurrency(sale_price_in_cents, currency),
		manage_inventory: v.manage_inventory,
		weight: v.weight_grams,
		options: [],
		inventory_quantity: v.manage_inventory ? v.inventory_quantity : null,
	};
}

function mapProduct(p, lang, currency) {
	const variants = (p.product_variants || [])
		.slice()
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
		.map(v => mapVariant(v, lang, currency));

	const images = (p.product_images || [])
		.slice()
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
		.map((img, i) => ({ url: img.url, order: img.sort_order ?? i, type: 'image' }));

	const lowest = variants.reduce((acc, v) => {
		if (acc == null) return v;
		const accPrice = acc.sale_price_in_cents ?? acc.price_in_cents ?? 0;
		const vPrice = v.sale_price_in_cents ?? v.price_in_cents ?? 0;
		return vPrice < accPrice ? v : acc;
	}, null);

	return {
		id: p.id,
		slug: p.slug,
		title: lang === 'en' ? p.title_en : p.title_es,
		subtitle: lang === 'en' ? p.subtitle_en : p.subtitle_es,
		ribbon_text: lang === 'en' ? p.ribbon_text_en : p.ribbon_text_es,
		description: lang === 'en' ? p.description_en : p.description_es,
		image: p.thumbnail_url || images[0]?.url || null,
		price_in_cents: lowest?.price_in_cents ?? 0,
		currency,
		purchasable: p.purchasable,
		order: p.sort_order ?? 0,
		site_product_selection: 'lowest_price_first',
		images,
		options: [],
		variants,
		collections: (p.product_collection_assignments || []).map(c => ({
			product_id: p.id,
			collection_id: c.collection_id,
			order: c.sort_order ?? 0,
		})),
		additional_info: (p.product_additional_info || [])
			.slice()
			.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
			.map(a => ({
				id: a.id,
				order: a.sort_order ?? 0,
				title: lang === 'en' ? a.title_en : a.title_es,
				description: lang === 'en' ? a.description_en : a.description_es,
			})),
		type: { value: p.type || '' },
		custom_fields: [],
		related_products: [],
		updated_at: p.updated_at,
		created_at: p.created_at,
		deleted_at: null,
		metadata: p.metadata || {},
		status: p.status,
	};
}

const PRODUCT_SELECT = `
	*,
	product_images ( id, url, alt_text, sort_order ),
	product_variants ( * ),
	product_collection_assignments ( collection_id, sort_order ),
	product_additional_info ( id, title_es, title_en, description_es, description_en, sort_order )
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProducts({ ids, slugs, limit, language, currency } = {}) {
	const lang = pickLang(language);
	const cur = pickCurrency(currency);

	let q = supabase.from('products').select(PRODUCT_SELECT).eq('status', 'published');
	if (ids?.length) q = q.in('id', ids);
	if (slugs?.length) q = q.in('slug', slugs);
	if (limit) q = q.limit(limit);
	q = q.order('sort_order', { ascending: true });

	const { data, error } = await q;
	if (error) throw error;

	const products = (data || []).map(p => mapProduct(p, lang, cur));
	return { count: products.length, offset: 0, limit: limit ?? products.length, products };
}

export async function getProduct(idOrSlug, { language, currency } = {}) {
	if (!idOrSlug) throw new Error('getProduct: id or slug required');
	const lang = pickLang(language);
	const cur = pickCurrency(currency);
	const column = UUID_RE.test(idOrSlug) ? 'id' : 'slug';

	const { data, error } = await supabase
		.from('products')
		.select(PRODUCT_SELECT)
		.eq(column, idOrSlug)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new Error(`Product not found: ${idOrSlug}`);
	return mapProduct(data, lang, cur);
}

export async function getProductBySlug(slug, opts) {
	return getProduct(slug, opts);
}

export async function getProductQuantities({ product_ids, variant_ids } = {}) {
	let q = supabase.from('product_variants').select('id, inventory_quantity, manage_inventory');
	if (product_ids?.length) q = q.in('product_id', product_ids);
	if (variant_ids?.length) q = q.in('id', variant_ids);
	const { data, error } = await q;
	if (error) throw error;
	return {
		variants: (data || []).map(v => ({
			id: v.id,
			inventory_quantity: v.manage_inventory ? v.inventory_quantity : null,
		})),
	};
}

export async function getCategories({ language } = {}) {
	const lang = pickLang(language);
	const { data, error } = await supabase
		.from('product_collections')
		.select('*')
		.order('sort_order', { ascending: true });
	if (error) throw error;
	return {
		categories: (data || []).map(c => ({
			id: c.id,
			slug: c.slug,
			title: lang === 'en' ? c.title_en : c.title_es,
			image_url: c.image_url,
			store_id: null,
			created_at: c.created_at,
			updated_at: c.updated_at,
			deleted_at: null,
			metadata: null,
		})),
		count: data?.length || 0,
	};
}

// Hostinger redirect-style checkout is no longer used — checkout is on-site
// via Stripe Elements (CheckoutPage.jsx). Kept as a hard error to surface any
// stale call site.
export async function initializeCheckout() {
	throw new Error('initializeCheckout has been removed; the on-site Stripe Elements flow in CheckoutPage handles payment.');
}
