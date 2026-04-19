import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { computeShippingMajor } from '@/lib/shipping';

const stripePublishableKey =
	import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
	import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
	'';

const stripePromise = stripePublishableKey
	? loadStripe(stripePublishableKey)
	: Promise.resolve(null);

const hasStripePublishableKey = !!(
	import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const CheckoutForm = ({
	orderId,
	totalAmountMajor,
	cartItems,
	shippingInfo,
	onSuccess,
	onFail,
}) => {
	const stripe = useStripe();
	const elements = useElements();
	const [error, setError] = useState(null);
	const [processing, setProcessing] = useState(false);
	const { user } = useAuth();

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		if (!user) {
			setError('You must be logged in to complete the purchase.');
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const { error: submitError } = await elements.submit();
			if (submitError) throw submitError;

			const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/checkout?step=processing`,
				},
				redirect: 'if_required',
			});

			if (confirmError) throw confirmError;

			if (paymentIntent && paymentIntent.status === 'succeeded') {
				await supabase
					.from('orders')
					.update({
						status: 'paid',
						paid_at: new Date().toISOString(),
						stripe_payment_intent_id: paymentIntent.id,
					})
					.eq('id', orderId);

				onSuccess(orderId);
			}
		} catch (err) {
			console.error('Payment/Order Error:', err);
			setError(err.message || 'An unexpected error occurred during checkout.');
			setProcessing(false);
			onFail(err);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="bg-slate-900 p-4 rounded-lg border border-white/10">
				<PaymentElement
					options={{
						layout: 'tabs',
						theme: 'night',
						variables: {
							colorPrimary: '#ff8518',
							colorBackground: '#1e293b',
							colorText: '#ffffff',
							colorDanger: '#ef4444',
						},
					}}
				/>
			</div>

			{error && (
				<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2">
					<AlertCircle className="w-5 h-5 flex-shrink-0" />
					<p className="text-sm font-light">{error}</p>
				</div>
			)}

			<Button
				type="submit"
				disabled={!stripe || processing}
				className="w-full bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-normal"
			>
				{processing ? (
					<>
						<Loader2 className="w-5 h-5 mr-2 animate-spin" />
						Processing Order...
					</>
				) : (
					`Pay RD$${totalAmountMajor.toFixed(2)}`
				)}
			</Button>
		</form>
	);
};

const CheckoutPage = () => {
	const { cartItems, getCartTotal, clearCart } = useCart();
	const { user } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState('shipping');
	const [clientSecret, setClientSecret] = useState('');
	const [pendingOrderId, setPendingOrderId] = useState(null);
	const [loading, setLoading] = useState(false);
	const [initError, setInitError] = useState(null);
	const [shippingMethod, setShippingMethod] = useState('standard');

	const [shippingInfo, setShippingInfo] = useState({
		firstName: '',
		lastName: '',
		email: '',
		address: '',
		city: '',
		zipCode: '',
		phone: '',
		country: 'Dominican Republic',
		taxId: '',
	});

	useEffect(() => {
		if (user?.email) {
			setShippingInfo((prev) => ({ ...prev, email: user.email }));
		}
	}, [user?.email]);

	const subtotalMajor = getCartTotal();
	const shippingMajor = useMemo(
		() => computeShippingMajor(subtotalMajor, shippingMethod),
		[subtotalMajor, shippingMethod],
	);
	const totalMajor = subtotalMajor + shippingMajor;
	const totalCents = Math.round(totalMajor * 100);
	const subtotalCents = Math.round(subtotalMajor * 100);
	const shippingCents = Math.round(shippingMajor * 100);

	useEffect(() => {
		if (cartItems.length === 0 && step === 'shipping') {
			navigate('/shop');
		}
	}, [cartItems.length, navigate, step]);

	const handleSuccess = (orderId) => {
		clearCart();
		localStorage.setItem('last_order_id', orderId);
		navigate(`/checkout-success?order_id=${orderId}`);
	};

	const handleFail = () => {
		/* logged in CheckoutForm */
	};

	const cancelPaymentStep = useCallback(async () => {
		if (pendingOrderId) {
			await supabase.from('orders').delete().eq('id', pendingOrderId);
		}
		setClientSecret('');
		setPendingOrderId(null);
		setStep('shipping');
	}, [pendingOrderId]);

	const handleContinueToPayment = async () => {
		if (!user) {
			setInitError('Please sign in to continue to payment.');
			return;
		}
		if (!shippingInfo.firstName || !shippingInfo.lastName || !shippingInfo.email || !shippingInfo.address) {
			setInitError('Please complete all required shipping fields.');
			return;
		}
		if (!hasStripePublishableKey) {
			setInitError('Missing VITE_STRIPE_PUBLISHABLE_KEY in environment.');
			return;
		}

		setLoading(true);
		setInitError(null);

		const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

		let createdOrderId = null;
		try {
			const { data: orderData, error: orderError } = await supabase
				.from('orders')
				.insert({
					user_id: user.id,
					order_number: orderNumber,
					status: 'awaiting_payment',
					total_amount: totalCents,
					subtotal_amount: subtotalCents,
					shipping_amount: shippingCents,
					items_count: cartItems.length,
					shipping_address: shippingInfo,
					shipping_method: shippingMethod,
					tax_id: shippingInfo.taxId || null,
					payment_method: 'Stripe',
					estimated_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
				})
				.select()
				.single();

			if (orderError) throw new Error(orderError.message);
			createdOrderId = orderData.id;

			const orderItems = cartItems.map((item) => ({
				order_id: orderData.id,
				product_id: item.product.id,
				product_name: item.product.title,
				quantity: item.quantity,
				price_per_item: item.variant.sale_price_in_cents ?? item.variant.price_in_cents,
				total_price:
					(item.variant.sale_price_in_cents ?? item.variant.price_in_cents) * item.quantity,
			}));

			const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
			if (itemsError) throw new Error(itemsError.message);

			const { data, error } = await supabase.functions.invoke('create-payment-intent', {
				body: {
					amount: totalMajor,
					currency: 'dop',
					order_id: orderData.id,
				},
			});

			if (error) throw error;
			if (data?.error) throw new Error(data.error);
			if (!data?.clientSecret) throw new Error('No client secret returned');

			await supabase
				.from('orders')
				.update({ stripe_payment_intent_id: data.paymentIntentId })
				.eq('id', orderData.id);

			setPendingOrderId(orderData.id);
			setClientSecret(data.clientSecret);
			setStep('payment');
		} catch (err) {
			console.error(err);
			if (createdOrderId) {
				await supabase.from('orders').delete().eq('id', createdOrderId);
			}
			setInitError(err.message || 'Could not start payment.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Helmet>
				<title>Checkout - Kibay Espumante</title>
			</Helmet>

			<Navigation />

			<div className="min-h-screen bg-slate-900 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<h1 className="text-3xl font-light text-white mb-8">Checkout</h1>

					<div className="grid lg:grid-cols-2 gap-12">
						<div className="space-y-8">
							<div className="bg-slate-800 p-6 rounded-xl border border-white/10">
								<h2 className="text-xl font-normal text-white mb-6">Shipping Information</h2>
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-light text-white/80">First Name</label>
											<input
												type="text"
												value={shippingInfo.firstName}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, firstName: e.target.value })
												}
												className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
												placeholder="John"
												required
												disabled={step === 'payment'}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-light text-white/80">Last Name</label>
											<input
												type="text"
												value={shippingInfo.lastName}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, lastName: e.target.value })
												}
												className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
												placeholder="Doe"
												required
												disabled={step === 'payment'}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-white/80">Email</label>
										<input
											type="email"
											value={shippingInfo.email}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, email: e.target.value })
											}
											className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
											placeholder="john@example.com"
											required
											disabled={step === 'payment'}
										/>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-white/80">Tax ID (RNC / optional)</label>
										<input
											type="text"
											value={shippingInfo.taxId}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, taxId: e.target.value })
											}
											className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
											placeholder="Optional"
											disabled={step === 'payment'}
										/>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-white/80">Address</label>
										<input
											type="text"
											value={shippingInfo.address}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, address: e.target.value })
											}
											className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
											placeholder="123 Main St"
											required
											disabled={step === 'payment'}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-light text-white/80">City</label>
											<input
												type="text"
												value={shippingInfo.city}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, city: e.target.value })
												}
												className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
												placeholder="Santo Domingo"
												required
												disabled={step === 'payment'}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-light text-white/80">Phone</label>
											<input
												type="tel"
												value={shippingInfo.phone}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, phone: e.target.value })
												}
												className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
												placeholder="+1 (809) 555-0123"
												required
												disabled={step === 'payment'}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-white/80">Shipping method</label>
										<select
											value={shippingMethod}
											onChange={(e) => setShippingMethod(e.target.value)}
											disabled={step === 'payment'}
											className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
										>
											<option value="standard">Standard (RD$200 under RD$5,000 cart)</option>
											<option value="express">Express (RD$400 under RD$5,000 cart)</option>
										</select>
										<p className="text-xs text-white/50 font-light">
											Orders RD$5,000+ ship free (same-origin policy; adjust in src/lib/shipping.js).
										</p>
									</div>
								</div>

								{step === 'shipping' && (
									<Button
										type="button"
										onClick={handleContinueToPayment}
										disabled={loading}
										className="w-full mt-8 bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-normal"
									>
										{loading ? (
											<>
												<Loader2 className="w-5 h-5 mr-2 animate-spin" />
												Preparing payment…
											</>
										) : (
											'Continue to secure payment'
										)}
									</Button>
								)}

								{step === 'payment' && (
									<Button
										type="button"
										variant="outline"
										onClick={cancelPaymentStep}
										className="w-full mt-4 border-white/20 text-white"
									>
										Change shipping / cancel
									</Button>
								)}
							</div>

							<div className="bg-slate-800 p-6 rounded-xl border border-white/10">
								<h2 className="text-xl font-normal text-white mb-6">Payment Details</h2>
								{!hasStripePublishableKey ? (
									<div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-lg text-sm font-light">
										Configure <code className="text-amber-100">VITE_STRIPE_PUBLISHABLE_KEY</code>{' '}
										in <code className="text-amber-100">.env.local</code> and Vercel env, then
										redeploy.
									</div>
								) : initError && step === 'shipping' ? (
									<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2">
										<AlertCircle className="w-5 h-5 flex-shrink-0" />
										<div>
											<p className="font-normal">Could not continue</p>
											<p className="text-sm font-light">{initError}</p>
										</div>
									</div>
								) : step === 'payment' && clientSecret && pendingOrderId ? (
									<Elements
										key={clientSecret}
										stripe={stripePromise}
										options={{ clientSecret, appearance: { theme: 'night' } }}
									>
										<CheckoutForm
											orderId={pendingOrderId}
											totalAmountMajor={totalMajor}
											cartItems={cartItems}
											shippingInfo={shippingInfo}
											onSuccess={handleSuccess}
											onFail={handleFail}
										/>
									</Elements>
								) : (
									<div className="text-white/50 text-sm font-light py-6">
										{step === 'shipping'
											? 'Complete shipping above, then continue to enter card details securely.'
											: null}
									</div>
								)}
							</div>
						</div>

						<div>
							<div className="bg-slate-800 p-6 rounded-xl border border-white/10 sticky top-28">
								<h2 className="text-xl font-normal text-white mb-6">Order Summary</h2>
								<div className="space-y-4 mb-6">
									{cartItems.map((item) => {
										const unit =
											(item.variant.sale_price_in_cents ?? item.variant.price_in_cents) / 100;
										return (
											<div
												key={item.variant.id}
												className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
											>
												<div className="flex items-center gap-4">
													<div className="w-12 h-12 bg-slate-900 rounded overflow-hidden">
														<img
															src={item.product.image}
															alt={item.product.title}
															className="w-full h-full object-cover"
														/>
													</div>
													<div>
														<p className="text-white font-medium text-sm">{item.product.title}</p>
														<p className="text-white/60 text-xs font-light">{item.variant.title}</p>
														<p className="text-white/40 text-xs font-light">Qty: {item.quantity}</p>
													</div>
												</div>
												<p className="text-white font-medium">
													RD${(unit * item.quantity).toFixed(2)}
												</p>
											</div>
										);
									})}
								</div>

								<div className="space-y-2 pt-4 border-t border-white/10">
									<div className="flex justify-between text-white/60 font-light">
										<span>Subtotal</span>
										<span>RD${subtotalMajor.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-white/60 font-light">
										<span>Shipping ({shippingMethod})</span>
										<span>RD${shippingMajor.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-white font-normal text-xl pt-2 mt-2 border-t border-white/10">
										<span>Total</span>
										<span className="text-mango-400">RD${totalMajor.toFixed(2)}</span>
									</div>
								</div>

								{step === 'payment' && (
									<p className="text-xs text-white/40 mt-4 font-light">
										Stripe confirms payment; our webhook marks the order paid and stores a PDF
										invoice under blog_media/invoices/.
									</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<Footer />
		</>
	);
};

export default CheckoutPage;
