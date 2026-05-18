import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, Loader2, AlertCircle, FileText, Truck, MapPin, Calendar, Instagram } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { publicStorageObjectUrl } from '@/lib/supabaseStorage';
import { formatDopFromCents } from '@/lib/formatMoney';
import SEOHead from '@/components/SEOHead';

const CheckoutSuccessPage = () => {
	const [searchParams] = useSearchParams();
	const orderId = searchParams.get('order_id');
	const { t, i18n } = useTranslation('checkout');
	const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2);

	const [order, setOrder] = useState(null);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchOrder = useCallback(async () => {
		if (!orderId) return null;
		const { data, error: fetchError } = await supabase.from('orders').select('*').eq('id', orderId).single();
		if (fetchError) throw fetchError;
		if (!data) throw new Error('Order not found.');
		// Pull line items + their product type so we can tell wine vs experience.
		const { data: itemRows } = await supabase
			.from('order_items')
			.select('id, product_name, quantity, price_per_item, total_price, metadata, product_id, products(type)')
			.eq('order_id', orderId);
		return { order: data, items: itemRows || [] };
	}, [orderId]);

	useEffect(() => {
		if (!orderId) {
			setLoading(false);
			setError('No order ID found.');
			return;
		}

		let cancelled = false;

		(async () => {
			try {
				setLoading(true);
				setError(null);
				const result = await fetchOrder();
				if (!cancelled && result) {
					setOrder(result.order);
					setItems(result.items);
				}
			} catch (err) {
				console.error('Fetch order error:', err);
				if (!cancelled) {
					setError(
						"We couldn't verify your order details immediately. Check Order history in your account.",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [orderId, fetchOrder]);

	// Webhook may attach invoice PDF shortly after payment — poll lightly.
	useEffect(() => {
		if (!orderId || !order || order.invoice_pdf_path) {
			return undefined;
		}

		let attempts = 0;
		let cancelled = false;
		const maxAttempts = 18;
		const id = setInterval(async () => {
			attempts += 1;
			const { data, error: e } = await supabase.from('orders').select('*').eq('id', orderId).single();
			if (cancelled) return;
			if (!e && data) {
				setOrder(data);
				if (data.invoice_pdf_path || attempts >= maxAttempts) {
					clearInterval(id);
				}
			} else if (attempts >= maxAttempts) {
				clearInterval(id);
			}
		}, 3000);

		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [orderId, order?.invoice_pdf_path, order?.id]);

	const invoiceHref =
		order?.invoice_pdf_path && publicStorageObjectUrl('blog_media', order.invoice_pdf_path);

	return (
		<>
			<SEOHead
				title={`${t('success.title')} — Kibay`}
				noindex
			/>

			<Navigation />

			<main id="main" role="main" className="min-h-screen bg-stone-50 pt-28 pb-20 px-4 flex items-center justify-center">
				<m.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="max-w-xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-stone-100 text-center relative overflow-hidden"
				>
					<div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

					{loading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="w-10 h-10 text-[#D4A574] animate-spin mb-4" />
							<p className="text-stone-500 font-light">{t('processing')}</p>
						</div>
					) : error ? (
						<div className="py-8">
							<AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" aria-hidden="true" />
							<h2 className="text-2xl font-light text-stone-900 mb-2">{t('success.title')}</h2>
							<p className="text-stone-500 mb-6 font-light">{error}</p>
							<Link to="/account">
								<Button variant="outline" className="border-[#D4A574] text-[#D4A574]">
									{t('success.viewOrder')}
								</Button>
							</Link>
						</div>
					) : (
						<>
							<m.div
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ delay: 0.2, type: 'spring' }}
								className="w-20 h-20 bg-[#D4A574]/10 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10"
							>
								<CheckCircle className="w-10 h-10 text-[#D4A574]" strokeWidth={1.5} />
							</m.div>

							<h1 className="text-3xl md:text-4xl font-light text-stone-900 mb-4 relative z-10">
								{t('success.title')}
							</h1>

							<p className="text-stone-500 mb-8 leading-relaxed relative z-10 font-light">
								{t('success.subtitle')}{' '}
								<span className="font-medium text-stone-900">{t('success.orderNumber')} #{order?.order_number}</span>
							</p>

							{/* Status pill — friendly translated label, not raw enum. */}
							<div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6 relative z-10">
								<CheckCircle className="w-4 h-4" />
								<span className="text-sm font-medium">
									{t(`statusLabel.${order?.status}`, order?.status || '')}
								</span>
							</div>

							{order?.shipping_address?.email && (
								<p className="text-stone-600 text-sm mb-6 relative z-10 font-light">
									{t('success.emailSentTo', { email: order.shipping_address.email })}
								</p>
							)}

							{items.length > 0 && (
								<div className="bg-stone-50 rounded-xl p-6 mb-6 border border-stone-100 relative z-10 text-left">
									<p className="text-stone-600 text-xs uppercase tracking-widest font-medium mb-3">
										{t('success.itemsTitle')}
									</p>
									<ul className="space-y-2">
										{items.map((it) => (
											<li key={it.id} className="flex justify-between gap-4 text-sm">
												<span className="text-stone-800">{it.quantity}× {it.product_name}</span>
												<span className="text-stone-600 font-mono whitespace-nowrap">{formatDopFromCents(it.total_price)}</span>
											</li>
										))}
									</ul>
									{invoiceHref && (
										<a
											href={invoiceHref}
											target="_blank"
											rel="noopener noreferrer"
											className="mt-4 flex items-center gap-2 text-[#D4A574] font-medium text-sm hover:underline"
										>
											<FileText className="w-4 h-4" />
											{t('success.downloadInvoice')}
										</a>
									)}
								</div>
							)}

							{(() => {
								const isExperience = items.some((it) => it.products?.type === 'experience');
								if (isExperience) {
									const expItem = items.find((it) => it.products?.type === 'experience');
									const meta = expItem?.metadata || {};
									const dateStr = meta.reservation_date
										? new Date(meta.reservation_date + 'T00:00:00').toLocaleDateString(
											lang === 'en' ? 'en-US' : 'es-DO',
											{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
										)
										: '—';
									const timeStr = meta.reservation_time || '11:00';
									return (
										<div className="bg-[#D4A574]/5 border border-[#D4A574]/20 rounded-xl p-6 mb-6 relative z-10 text-left">
											<p className="text-stone-700 text-xs uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
												<Calendar className="w-3.5 h-3.5 text-[#D4A574]" />
												{t('success.nextExperience.title')}
											</p>
											<ul className="space-y-2 text-sm text-stone-700">
												<li>{t('success.nextExperience.step1', { date: dateStr, time: timeStr })}</li>
												<li className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 text-[#D4A574] flex-shrink-0" />{t('success.nextExperience.step2')}</li>
												<li>{t('success.nextExperience.step3')}</li>
											</ul>
										</div>
									);
								}
								return (
									<div className="bg-[#D4A574]/5 border border-[#D4A574]/20 rounded-xl p-6 mb-6 relative z-10 text-left">
										<p className="text-stone-700 text-xs uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
											<Truck className="w-3.5 h-3.5 text-[#D4A574]" />
											{t('success.nextWine.title')}
										</p>
										<ol className="space-y-2 text-sm text-stone-700 list-decimal list-inside">
											<li>{t('success.nextWine.step1')}</li>
											<li>{t('success.nextWine.step2')}</li>
											<li>{t('success.nextWine.step3')}</li>
										</ol>
									</div>
								);
							})()}

							<div className="text-center mb-6 relative z-10">
								<p className="text-xs uppercase tracking-widest text-stone-500 mb-2">{t('success.shareTitle')}</p>
								<a
									href="https://www.instagram.com/kibaywine/"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 text-[#D4A574] hover:text-[#c29462] text-sm font-medium"
								>
									<Instagram className="w-4 h-4" />
									{t('success.shareCaption')}
								</a>
							</div>

							<div className="flex flex-col sm:flex-row gap-3 relative z-10 mb-4">
								<Link to="/account" className="flex-1">
									<Button variant="outline" className="w-full border-stone-200 text-stone-800">
										{t('success.viewOrder')}
									</Button>
								</Link>
							</div>
						</>
					)}

					<div className="relative z-10">
						<Link to="/shop">
							<Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full py-6 text-lg transition-all duration-300 shadow-lg shadow-[#D4A574]/20 font-normal">
								{t('success.continueShopping')}
								<ArrowRight className="ml-2 w-5 h-5" />
							</Button>
						</Link>
					</div>
				</m.div>
			</main>

			<Footer />
		</>
	);
};

export default CheckoutSuccessPage;
