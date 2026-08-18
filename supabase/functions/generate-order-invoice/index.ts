// generate-order-invoice — itemized PDF invoice with ITBIS breakdown +
// sequential invoice numbering, uploaded to storage.
// =============================================================================
// Extracted from stripe-webhook/handlePaymentIntentSucceeded, which was the
// ONLY place this ran — meaning CardNet orders (100% of real orders today,
// Stripe is being phased out per docs/CARDNET_INTEGRATION.md) never got an
// invoice PDF at all. This is now a standalone function so both
// cardnet-callback and cardnet-verify-session (and, until Stripe is fully
// removed, stripe-webhook) can call it server-to-server the same way they
// already call send-order-email.
//
// This is the "Option A" invoice from the order-processing-panel plan — a
// professional itemized PDF, NOT a DGII e-CF fiscal document. Full e-CF
// integration (submit-order-ecf) is a separate, government-certification-
// gated track; this function's output stays the customer-facing receipt
// regardless of that integration's status.
//
// Called with: { order_id: uuid }
// Auth: service-role bearer only (server-to-server, no admin-JWT flow).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Auth for this function's own incoming requests — a dedicated token, not
// serviceKey. SUPABASE_SERVICE_ROLE_KEY's auto-injected value isn't reliably
// identical across Edge Functions deployed at different times (same issue
// hit and fixed for the /transactional/send relay — see send-order-email's
// TRANSACTIONAL_RELAY_TOKEN comment), so callers send this instead.
const relayToken = Deno.env.get('TRANSACTIONAL_RELAY_TOKEN') || '';

// Mirrors src/lib/legalEntity.js — Edge Functions can't import from the SPA
// bundle, so this is intentionally duplicated. If the legal entity changes,
// update BOTH (see the comment at the top of legalEntity.js for the full
// list of places that also need updating).
const LEGAL = {
	razonSocial: 'LADISON DOMINICANA SRL',
	rnc: '131128033',
	licenseLine: 'Licencia de Fabricación de Vinos VINO-022 (DGII, emitida 17/06/2023)',
	address: 'Bahía de Ocoa, Km 6½ Hatillo, Azua 71003, República Dominicana',
};

const ITBIS_RATE = 0.18;

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

serve(async (req) => {
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	const auth = req.headers.get('authorization') || '';
	const token = auth.replace(/^Bearer\s+/i, '');
	if (!token || token !== relayToken) return json({ error: 'unauthorized' }, 401);

	let body: { order_id?: string };
	try {
		body = await req.json();
	} catch {
		return json({ error: 'bad_json' }, 400);
	}
	const orderId = body.order_id;
	if (!orderId) return json({ error: 'order_id required' }, 400);

	try {
		return await generateInvoice(orderId);
	} catch (e) {
		console.error('generate-order-invoice: uncaught error', e);
		return json({ error: 'uncaught', message: (e as Error).message }, 500);
	}
});

async function generateInvoice(orderId: string): Promise<Response> {
	const admin = createClient(supabaseUrl, serviceKey);

	const { data: order, error: orderErr } = await admin
		.from('orders')
		.select('id, order_number, status, total_amount, subtotal_amount, shipping_amount, currency, shipping_address, invoice_pdf_path, invoice_number')
		.eq('id', orderId)
		.maybeSingle();
	if (orderErr || !order) return json({ error: 'order_not_found' }, 404);

	// Only paid orders get a real invoice. Idempotent — a second call for an
	// order that already has one (both cardnet-callback and
	// cardnet-verify-session can independently reach the paid transition) is
	// a safe no-op rather than a duplicate/overwritten PDF.
	if (order.status !== 'paid') return json({ error: 'order_not_paid' }, 409);
	if (order.invoice_pdf_path && order.invoice_number) {
		return json({ ok: true, already: true, invoice_number: order.invoice_number, invoice_pdf_path: order.invoice_pdf_path });
	}

	const { data: items } = await admin
		.from('order_items')
		.select('product_name, quantity, price_per_item, total_price')
		.eq('order_id', orderId);

	// Assign the invoice number atomically server-side (never client-side) —
	// avoids race duplicates if both CardNet paths call this concurrently.
	const { data: invoiceNumber, error: numErr } = await admin.rpc('next_invoice_number');
	if (numErr || !invoiceNumber) {
		console.error('generate-order-invoice: next_invoice_number failed', numErr);
		return json({ error: 'invoice_number_failed' }, 500);
	}

	const currency = order.currency === 'USD' ? 'USD' : 'DOP';
	const symbol = currency === 'USD' ? '$' : 'RD$';
	const fmt = (cents: number) => `${symbol}${(Number(cents || 0) / 100).toFixed(2)}`;

	// ITBIS is folded into subtotal_amount (Kibay's product prices are
	// tax-inclusive, same convention already used when sending Tax='0' to
	// CARDNET — see cardnet-create-session). Back out the breakdown for
	// display: subtotal_amount = pre-tax subtotal × 1.18.
	const subtotalInclTax = Number(order.subtotal_amount || 0);
	const subtotalExclTax = subtotalInclTax / (1 + ITBIS_RATE);
	const itbisAmount = subtotalInclTax - subtotalExclTax;
	const shipping = Number(order.shipping_amount || 0);
	const total = Number(order.total_amount || 0);

	const ship = (order.shipping_address as Record<string, string>) || {};
	const customerName = `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || ship.email || '';

	const pdf = await PDFDocument.create();
	const page = pdf.addPage([595.28, 841.89]);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	const gray = rgb(0.45, 0.45, 0.45);
	const dark = rgb(0.1, 0.1, 0.1);

	let y = 800;
	// Standard PDF fonts (WinAnsi encoding) can't render the stylized 'Λ' used
	// in the brand wordmark elsewhere (HTML/CSS) — plain text here instead.
	page.drawText('KIBAY', { x: 50, y, size: 22, font: bold, color: dark });
	page.drawText('FACTURA / INVOICE', { x: 400, y: y + 4, size: 12, font: bold, color: dark });
	y -= 20;
	page.drawText(LEGAL.razonSocial, { x: 50, y, size: 9, font, color: gray });
	page.drawText(`No. ${invoiceNumber}`, { x: 400, y, size: 10, font, color: dark });
	y -= 12;
	page.drawText(`RNC ${LEGAL.rnc}`, { x: 50, y, size: 9, font, color: gray });
	y -= 12;
	page.drawText(LEGAL.licenseLine, { x: 50, y, size: 9, font, color: gray });
	y -= 12;
	page.drawText(LEGAL.address, { x: 50, y, size: 9, font, color: gray });

	y -= 32;
	page.drawText(`Pedido / Order: ${order.order_number}`, { x: 50, y, size: 11, font: bold, color: dark });
	y -= 16;
	page.drawText(`Fecha / Date: ${new Date().toLocaleDateString('es-DO')}`, { x: 50, y, size: 10, font, color: gray });
	y -= 16;
	if (customerName) {
		page.drawText(`Cliente / Customer: ${customerName}`, { x: 50, y, size: 10, font, color: gray });
		y -= 16;
	}

	y -= 12;
	page.drawText('Producto / Item', { x: 50, y, size: 10, font: bold, color: dark });
	page.drawText('Cant.', { x: 350, y, size: 10, font: bold, color: dark });
	page.drawText('Precio', { x: 400, y, size: 10, font: bold, color: dark });
	page.drawText('Total', { x: 490, y, size: 10, font: bold, color: dark });
	y -= 6;
	page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: gray });
	y -= 16;

	for (const row of items || []) {
		if (y < 150) break; // guard against overflow — Kibay's order sizes are small, this shouldn't trigger in practice
		const name = String(row.product_name || '').slice(0, 40);
		page.drawText(name, { x: 50, y, size: 9, font, color: dark });
		page.drawText(String(row.quantity), { x: 350, y, size: 9, font, color: dark });
		page.drawText(fmt(row.price_per_item), { x: 400, y, size: 9, font, color: dark });
		page.drawText(fmt(row.total_price), { x: 490, y, size: 9, font, color: dark });
		y -= 16;
	}

	y -= 10;
	page.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 0.5, color: gray });
	y -= 18;
	page.drawText('Subtotal (sin ITBIS):', { x: 350, y, size: 9, font, color: gray });
	page.drawText(fmt(subtotalExclTax), { x: 490, y, size: 9, font, color: dark });
	y -= 16;
	page.drawText('ITBIS (18%):', { x: 350, y, size: 9, font, color: gray });
	page.drawText(fmt(itbisAmount), { x: 490, y, size: 9, font, color: dark });
	y -= 16;
	page.drawText('Envío / Shipping:', { x: 350, y, size: 9, font, color: gray });
	page.drawText(fmt(shipping), { x: 490, y, size: 9, font, color: dark });
	y -= 20;
	page.drawText('TOTAL:', { x: 350, y, size: 12, font: bold, color: dark });
	page.drawText(fmt(total), { x: 490, y, size: 12, font: bold, color: dark });

	page.drawText(
		'Este documento es un comprobante interno de Kibay y no constituye un e-CF fiscal.',
		{ x: 50, y: 60, size: 7, font, color: gray },
	);
	page.drawText(
		'This document is an internal Kibay receipt and does not constitute a DGII fiscal e-CF.',
		{ x: 50, y: 48, size: 7, font, color: gray },
	);

	const pdfBytes = await pdf.save();
	const path = `invoices/${orderId}.pdf`;
	const { error: upErr } = await admin.storage.from('blog_media').upload(path, pdfBytes, {
		contentType: 'application/pdf',
		upsert: true,
	});
	if (upErr) {
		console.error('generate-order-invoice: upload failed', upErr);
		return json({ error: 'upload_failed' }, 500);
	}

	const { error: updErr } = await admin
		.from('orders')
		.update({ invoice_pdf_path: path, invoice_number: invoiceNumber })
		.eq('id', orderId);
	if (updErr) {
		console.error('generate-order-invoice: order update failed', updErr);
		return json({ error: 'order_update_failed' }, 500);
	}

	return json({ ok: true, invoice_number: invoiceNumber, invoice_pdf_path: path });
}
