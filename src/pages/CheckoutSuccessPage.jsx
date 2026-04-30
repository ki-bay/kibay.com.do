import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, Loader2, AlertCircle, FileText } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { publicStorageObjectUrl } from '@/lib/supabaseStorage';

const CheckoutSuccessPage = () => {
	const [searchParams] = useSearchParams();
	const orderId = searchParams.get('order_id');

	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchOrder = useCallback(async () => {
		if (!orderId) return null;
		const { data, error: fetchError } = await supabase.from('orders').select('*').eq('id', orderId).single();
		if (fetchError) throw fetchError;
		if (!data) throw new Error('Order not found.');
		return data;
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
				const data = await fetchOrder();
				if (!cancelled) setOrder(data);
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
		const maxAttempts = 18;
		const id = setInterval(async () => {
			attempts += 1;
			const { data, error: e } = await supabase.from('orders').select('*').eq('id', orderId).single();
			if (!e && data) {
				setOrder(data);
				if (data.invoice_pdf_path || attempts >= maxAttempts) {
					clearInterval(id);
				}
			} else if (attempts >= maxAttempts) {
				clearInterval(id);
			}
		}, 3000);

		return () => clearInterval(id);
	}, [orderId, order?.invoice_pdf_path, order?.id]);

	const invoiceHref =
		order?.invoice_pdf_path && publicStorageObjectUrl('blog_media', order.invoice_pdf_path);

	return (
		<>
			<Helmet>
				<title>Order Confirmed - Kibay Espumante</title>
			</Helmet>

			<Navigation />

			<div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4 flex items-center justify-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="max-w-xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-stone-100 text-center relative overflow-hidden"
				>
					<div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

					{loading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="w-10 h-10 text-[#D4A574] animate-spin mb-4" />
							<p className="text-stone-500 font-light">Verifying order…</p>
						</div>
					) : error ? (
						<div className="py-8">
							<AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
							<h1 className="text-2xl font-light text-stone-900 mb-2">Order status</h1>
							<p className="text-stone-500 mb-6 font-light">{error}</p>
							<Link to="/account">
								<Button variant="outline" className="border-[#D4A574] text-[#D4A574]">
									Order history
								</Button>
							</Link>
						</div>
					) : (
						<>
							<motion.div
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ delay: 0.2, type: 'spring' }}
								className="w-20 h-20 bg-[#D4A574]/10 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10"
							>
								<CheckCircle className="w-10 h-10 text-[#D4A574]" strokeWidth={1.5} />
							</motion.div>

							<h1 className="text-3xl md:text-4xl font-light text-stone-900 mb-4 relative z-10">
								Order confirmed
							</h1>

							<p className="text-stone-500 mb-8 leading-relaxed relative z-10 font-light">
								Thank you for choosing Kibay. Your order{' '}
								<span className="font-medium text-stone-900">#{order?.order_number}</span> is recorded.
								Confirmation may be sent to{' '}
								<span className="font-medium text-stone-900">
									{order?.shipping_address?.email || 'your account email'}
								</span>
								.
							</p>

							<div className="bg-stone-50 rounded-xl p-6 mb-6 border border-stone-100 relative z-10 text-left">
								<div className="flex items-center justify-center gap-2 mb-2">
									<Sparkles className="w-4 h-4 text-[#D4A574]" />
									<p className="text-stone-400 text-xs uppercase tracking-widest font-normal text-center w-full">
										Status
									</p>
								</div>
								<p className="text-stone-800 font-medium text-lg text-center">{order?.status}</p>
								{order?.estimated_delivery_date && (
									<p className="text-xs text-stone-400 mt-2 text-center">
										Est. delivery:{' '}
										{new Date(order.estimated_delivery_date).toLocaleDateString()}
									</p>
								)}
								{invoiceHref ? (
									<a
										href={invoiceHref}
										target="_blank"
										rel="noreferrer"
										className="mt-4 flex items-center justify-center gap-2 text-[#D4A574] font-medium text-sm hover:underline"
									>
										<FileText className="w-4 h-4" />
										Download invoice (PDF)
									</a>
								) : (
									<p className="text-xs text-stone-400 mt-3 text-center">
										Invoice PDF appears here once payment is finalized (usually within a minute).
									</p>
								)}
							</div>

							<div className="flex flex-col sm:flex-row gap-3 relative z-10 mb-4">
								<Link to="/account" className="flex-1">
									<Button variant="outline" className="w-full border-stone-200 text-stone-800">
										View order history
									</Button>
								</Link>
							</div>
						</>
					)}

					<div className="relative z-10">
						<Link to="/shop">
							<Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-foreground rounded-full py-6 text-lg transition-all duration-300 shadow-lg shadow-[#D4A574]/20 font-normal">
								Continue shopping
								<ArrowRight className="ml-2 w-5 h-5" />
							</Button>
						</Link>
					</div>
				</motion.div>
			</div>

			<Footer />
		</>
	);
};

export default CheckoutSuccessPage;
