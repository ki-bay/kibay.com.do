import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
	if (req.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
		return new Response('Missing configuration', { status: 500 });
	}

	const stripe = new Stripe(stripeKey, {
		apiVersion: '2023-10-16',
		httpClient: Stripe.createFetchHttpClient(),
	});

	const signature = req.headers.get('stripe-signature');
	if (!signature) {
		return new Response('No signature', { status: 400 });
	}

	const body = await req.text();
	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed', err);
		return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
	}

	const admin = createClient(supabaseUrl, serviceKey);

	// --- Idempotency: have we processed this event.id before? ---
	const { error: insertEventErr } = await admin
		.from('webhook_events')
		.insert({ event_id: event.id, event_type: event.type });
	if (insertEventErr) {
		const code = (insertEventErr as { code?: string }).code;
		if (code === '23505') {
			console.log(`Skipping duplicate Stripe event ${event.id}`);
			return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
		}
		// Any other DB error: log and proceed (don't infinite-retry on app bugs).
		console.error('webhook_events insert failed (proceeding anyway):', insertEventErr);
	}

	try {
		if (event.type === 'payment_intent.succeeded') {
			await handlePaymentIntentSucceeded(admin, event.data.object as Stripe.PaymentIntent);
		} else if (event.type === 'payment_intent.payment_failed') {
			await setOrderStatusFromIntent(admin, event.data.object as Stripe.PaymentIntent, 'failed');
		} else if (event.type === 'payment_intent.canceled') {
			await setOrderStatusFromIntent(admin, event.data.object as Stripe.PaymentIntent, 'canceled');
		} else if (event.type === 'charge.refunded') {
			await handleChargeRefunded(admin, event.data.object as Stripe.Charge);
		} else {
			console.log(`Unhandled event type ${event.type}`);
		}
	} catch (handlerErr) {
		console.error(`Handler for ${event.type} threw:`, handlerErr);
	}

	return new Response(JSON.stringify({ received: true }), { status: 200 });
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handlePaymentIntentSucceeded(
	admin: ReturnType<typeof createClient>,
	pi: Stripe.PaymentIntent,
) {
	const orderId = pi.metadata?.order_id;
	if (!orderId) {
		console.log('payment_intent.succeeded without order_id metadata — skipping');
		return;
	}

	const { data: order, error: fetchErr } = await admin
		.from('orders')
		.select('id,order_number,total_amount,status,shipping_address')
		.eq('id', orderId)
		.single();

	if (fetchErr || !order) {
		console.error('Order not found for webhook', orderId, fetchErr);
		return;
	}

	// Only flip into 'paid' from awaiting_payment. Inventory trigger fires here.
	const { error: updateErr } = await admin
		.from('orders')
		.update({
			status: 'paid',
			paid_at: new Date().toISOString(),
			stripe_payment_intent_id: pi.id,
		})
		.eq('id', orderId)
		.eq('status', 'awaiting_payment');
	if (updateErr) {
		console.error('Order paid-flip failed:', updateErr);
		return;
	}

	// Invoice PDF (best-effort).
	try {
		const { data: items } = await admin.from('order_items').select('*').eq('order_id', orderId);

		const pdf = await PDFDocument.create();
		const page = pdf.addPage([595.28, 841.89]);
		const font = await pdf.embedFont(StandardFonts.Helvetica);
		const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
		let y = 800;
		page.drawText('KIBAY — Invoice', { x: 50, y, size: 18, font: bold, color: rgb(0.15, 0.15, 0.15) });
		y -= 28;
		page.drawText(`Order: ${order.order_number}`, { x: 50, y, size: 11, font });
		y -= 16;
		page.drawText(`Payment intent: ${pi.id}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
		y -= 24;
		const totalMajor = (Number(order.total_amount) || 0) / 100;
		page.drawText(`Total (DOP): RD$${totalMajor.toFixed(2)}`, { x: 50, y, size: 12, font: bold });
		y -= 28;
		page.drawText('Items', { x: 50, y, size: 11, font: bold });
		y -= 18;
		for (const row of items || []) {
			const line = `${row.product_name} × ${row.quantity} — RD$${(Number(row.total_price) / 100).toFixed(2)}`;
			page.drawText(line.substring(0, 90), { x: 50, y, size: 9, font });
			y -= 14;
			if (y < 80) break;
		}
		const pdfBytes = await pdf.save();
		const path = `invoices/${orderId}.pdf`;
		const { error: upErr } = await admin.storage.from('blog_media').upload(path, pdfBytes, {
			contentType: 'application/pdf',
			upsert: true,
		});
		if (!upErr) {
			await admin.from('orders').update({ invoice_pdf_path: path }).eq('id', orderId);
		} else {
			console.error('Invoice upload failed', upErr);
		}
	} catch (pdfErr) {
		console.error('Invoice generation failed', pdfErr);
	}

	// Customer confirmation + admin notification (both best-effort).
	await triggerOrderEmail(orderId, 'confirmation');
	await triggerOrderEmail(orderId, 'admin_new_order');
}

async function setOrderStatusFromIntent(
	admin: ReturnType<typeof createClient>,
	pi: Stripe.PaymentIntent,
	newStatus: 'failed' | 'canceled',
) {
	const orderId = pi.metadata?.order_id;
	if (!orderId) {
		console.log(`${newStatus} event without order_id metadata — skipping`);
		return;
	}
	const { error } = await admin
		.from('orders')
		.update({ status: newStatus, stripe_payment_intent_id: pi.id })
		.eq('id', orderId)
		.eq('status', 'awaiting_payment');
	if (error) console.error(`Order ${orderId} → ${newStatus} failed:`, error);
}

async function handleChargeRefunded(
	admin: ReturnType<typeof createClient>,
	charge: Stripe.Charge,
) {
	const piId =
		typeof charge.payment_intent === 'string'
			? charge.payment_intent
			: charge.payment_intent?.id;
	if (!piId) {
		console.log('charge.refunded without payment_intent — skipping');
		return;
	}
	const { data: order, error: fetchErr } = await admin
		.from('orders')
		.select('id')
		.eq('stripe_payment_intent_id', piId)
		.eq('status', 'paid')
		.maybeSingle();
	if (fetchErr) {
		console.error(`Refund lookup failed for PI ${piId}:`, fetchErr);
		return;
	}
	if (!order) return; // already refunded or never paid

	const { error } = await admin
		.from('orders')
		.update({ status: 'refunded' })
		.eq('id', order.id)
		.eq('status', 'paid');
	if (error) {
		console.error(`Refund flip failed for order ${order.id}:`, error);
		return;
	}
	await triggerOrderEmail(order.id, 'refund');
	await triggerOrderEmail(order.id, 'admin_refunded');
}

// Best-effort: invoke send-order-email; don't fail the webhook if it errors.
async function triggerOrderEmail(
	orderId: string,
	type: 'confirmation' | 'tracking' | 'refund' | 'admin_new_order' | 'admin_refunded',
) {
	try {
		const resp = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${serviceKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ order_id: orderId, type }),
		});
		if (!resp.ok) {
			const text = await resp.text();
			console.error(`send-order-email (${type}) failed`, resp.status, text);
		}
	} catch (e) {
		console.error(`send-order-email (${type}) threw`, e);
	}
}
