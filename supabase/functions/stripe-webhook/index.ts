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
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed', err);
		return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
	}

	const admin = createClient(supabaseUrl, serviceKey);

	if (event.type === 'payment_intent.succeeded') {
		const pi = event.data.object as Stripe.PaymentIntent;
		const orderId = pi.metadata?.order_id;
		if (!orderId) {
			console.log('payment_intent.succeeded without order_id metadata — skipping DB update');
			return new Response(JSON.stringify({ received: true }), { status: 200 });
		}

		const paidAt = new Date().toISOString();
		const { data: order, error: fetchErr } = await admin
			.from('orders')
			.select('id,order_number,total_amount,status,shipping_address')
			.eq('id', orderId)
			.single();

		if (fetchErr || !order) {
			console.error('Order not found for webhook', orderId, fetchErr);
			return new Response(JSON.stringify({ received: true }), { status: 200 });
		}

		await admin
			.from('orders')
			.update({
				status: 'paid',
				paid_at: paidAt,
				stripe_payment_intent_id: pi.id,
			})
			.eq('id', orderId)
			.in('status', ['awaiting_payment', 'paid']);

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
	}

	return new Response(JSON.stringify({ received: true }), { status: 200 });
});
