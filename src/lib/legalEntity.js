// Legal entity data — single source of truth for Kibay's registered business.
//
// Anything that displays who Kibay is on a legally-binding artifact (invoices,
// order confirmation emails, CARDNET merchant page, terms of service footer)
// MUST source from here, not duplicate the strings inline.
//
// Per the skill's KB-drift gotcha pattern (ai-hitl-chat-skill #16): the
// expensive class of bug is "AI/copy/billing all drift apart on values like
// price, duration, legal entity." The fix is to make drift mechanically
// impossible by importing from one place.
//
// IF THE LEGAL ENTITY CHANGES (rename, re-registration, license renewal, etc.):
//   1. Update the values below.
//   2. Update the parallel Spanish copy in supabase/functions/send-order-email/index.ts
//      (the LEGAL_FOOTER_ES / LEGAL_FOOTER_EN constants — they're inlined there
//      because Edge Functions don't share JS modules with the Vite SPA).
//   3. Update CARDNET_MERCHANT_NAME secret on Supabase if the razón social
//      changes:
//        npx supabase secrets set CARDNET_MERCHANT_NAME="<exactly 40 chars>"
//      Format per CARDNET Botón de Pago spec: 22-char name + 13-char city +
//      3-char state + 2-char country (no separators).
//   4. Update the prod CARDNET affiliation paperwork with the new razón social.

export const LEGAL_ENTITY = {
	// Razón social — the registered legal name with DGII (DR tax authority).
	// This is what appears on invoices, the CARDNET merchant statement, and
	// the affiliation paperwork.
	razonSocial: 'LADISON DOMINICANA SRL',
	// Brand name — what customers see on the storefront and recognize.
	// Distinct from razonSocial; both can coexist on the same artifact.
	brand: 'Kibay',
	// Registro Nacional del Contribuyente — DGII tax ID.
	rnc: '131128033',
	// DGII wine-manufacturing license.
	license: {
		code: 'VINO-022',
		typeEs: 'Licencia de Fabricación de Vinos',
		typeEn: 'Wine Manufacturing License',
		issuedAt: '2023-06-17',
		status: 'VIGENTE',
	},
	address: {
		street: 'Bahía de Ocoa, Km 6½ Hatillo',
		city: 'Azua',
		postal: '71003',
		countryEs: 'República Dominicana',
		countryEn: 'Dominican Republic',
	},
	contact: {
		email: 'info@kibay.com.do',
		web: 'kibay.com.do',
	},
};

// Compact one-line legal disclaimer suitable for the bottom of receipts,
// emails, and the invoice PDF footer. Localized.
export function formatLegalFooter(lang = 'es') {
	const e = LEGAL_ENTITY;
	const licType = lang === 'es' ? e.license.typeEs : e.license.typeEn;
	const country = lang === 'es' ? e.address.countryEs : e.address.countryEn;
	const issuedAt = formatDateForLocale(e.license.issuedAt, lang);
	return [
		`${e.razonSocial} · RNC ${e.rnc}`,
		`${licType} ${e.license.code} (DGII) · ${lang === 'es' ? 'Emitida' : 'Issued'} ${issuedAt}`,
		`${e.address.street}, ${e.address.city} ${e.address.postal}, ${country}`,
	].join('\n');
}

function formatDateForLocale(iso, lang) {
	// iso = 'YYYY-MM-DD'
	const [y, m, d] = (iso || '').split('-');
	if (!y || !m || !d) return iso;
	return lang === 'es' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}
