import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const symbolFor = (currency) => (String(currency || '').toUpperCase() === 'USD' ? '$' : 'RD$');

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
	currencySymbol,
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
	const { t } = useTranslation('checkout');

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
			<div className="bg-background p-4 rounded-lg border border-foreground/10">
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
						{t('processing')}
					</>
				) : (
					`${t('payNow')} ${currencySymbol}${totalAmountMajor.toFixed(2)}`
				)}
			</Button>
		</form>
	);
};

const CheckoutPage = () => {
	const { cartItems, getCartTotal, clearCart } = useCart();
	const { user } = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation('checkout');
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
	const cartCurrency = cartItems[0]?.variant?.currency || 'DOP';
	const symbol = symbolFor(cartCurrency);

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
					currency: cartCurrency,
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
				variant_id: item.variant.id,
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
					currency: cartCurrency.toLowerCase(),
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
				<title>{t('title')} — Kibay</title>
			</Helmet>

			<Navigation />

			<div className="min-h-screen bg-background pt-28 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<h1 className="text-3xl font-light text-foreground mb-8">{t('title')}</h1>

					<div className="grid lg:grid-cols-2 gap-12">
						<div className="space-y-8">
							<div className="bg-card p-6 rounded-xl border border-foreground/10">
								<h2 className="text-xl font-normal text-foreground mb-6">{t('shippingAddress')}</h2>
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-light text-foreground/80">{t('fullName')}</label>
											<input
												type="text"
												value={shippingInfo.firstName}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, firstName: e.target.value })
												}
												className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
												placeholder="John"
												required
												disabled={step === 'payment'}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-light text-foreground/80"> </label>
											<input
												type="text"
												value={shippingInfo.lastName}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, lastName: e.target.value })
												}
												className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
												placeholder="Doe"
												required
												disabled={step === 'payment'}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-foreground/80">{t('email')}</label>
										<input
											type="email"
											value={shippingInfo.email}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, email: e.target.value })
											}
											className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
											placeholder="john@example.com"
											required
											disabled={step === 'payment'}
										/>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-foreground/80">{t('taxId')}</label>
										<input
											type="text"
											value={shippingInfo.taxId}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, taxId: e.target.value })
											}
											className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
											placeholder="Optional"
											disabled={step === 'payment'}
										/>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-foreground/80">{t('address')}</label>
										<input
											type="text"
											value={shippingInfo.address}
											onChange={(e) =>
												setShippingInfo({ ...shippingInfo, address: e.target.value })
											}
											className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
											placeholder="123 Main St"
											required
											disabled={step === 'payment'}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-light text-foreground/80">{t('city')}</label>
											<input
												type="text"
												value={shippingInfo.city}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, city: e.target.value })
												}
												className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
												placeholder="Santo Domingo"
												required
												disabled={step === 'payment'}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-light text-foreground/80">{t('phone')}</label>
											<input
												type="tel"
												value={shippingInfo.phone}
												onChange={(e) =>
													setShippingInfo({ ...shippingInfo, phone: e.target.value })
												}
												className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
												placeholder="+1 (809) 555-0123"
												required
												disabled={step === 'payment'}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-sm font-light text-foreground/80">{t('shippingMethod')}</label>
										<select
											value={shippingMethod}
											onChange={(e) => setShippingMethod(e.target.value)}
											disabled={step === 'payment'}
											className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
										>
											<option value="standard">{t('standard')} (RD$200)</option>
											<option value="express">{t('express')} (RD$400)</option>
										</select>
										<p className="text-xs text-foreground/50 font-light">
											{t('freeOver')}
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
												{t('processing')}
											</>
										) : (
											t('payNow')
										)}
									</Button>
								)}

								{step === 'payment' && (
									<Button
										type="button"
										variant="outline"
										onClick={cancelPaymentStep}
										className="w-full mt-4 border-foreground/20 text-foreground"
									>
										{t('shippingAddress')} ↺
									</Button>
								)}
							</div>

							<div className="bg-card p-6 rounded-xl border border-foreground/10">
								<h2 className="text-xl font-normal text-foreground mb-6">{t('payment')}</h2>
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
											currencySymbol={symbol}
											cartItems={cartItems}
											shippingInfo={shippingInfo}
											onSuccess={handleSuccess}
											onFail={handleFail}
										/>
									</Elements>
								) : (
									<div className="text-foreground/50 text-sm font-light py-6">
										{step === 'shipping'
											? 'Complete shipping above, then continue to enter card details securely.'
											: null}
									</div>
								)}
							</div>
						</div>

						<div>
							<div className="bg-card p-6 rounded-xl border border-foreground/10 sticky top-28">
								<h2 className="text-xl font-normal text-foreground mb-6">{t('orderSummary')}</h2>
								<div className="space-y-4 mb-6">
									{cartItems.map((item) => {
										const unit =
											(item.variant.sale_price_in_cents ?? item.variant.price_in_cents) / 100;
										return (
											<div
												key={item.variant.id}
												className="flex justify-between items-center py-2 border-b border-foreground/5 last:border-0"
											>
												<div className="flex items-center gap-4">
													<div className="w-12 h-12 bg-background rounded overflow-hidden">
														<img
															src={item.product.image}
															alt={item.product.title}
															className="w-full h-full object-cover"
														/>
													</div>
													<div>
														<p className="text-foreground font-medium text-sm">{item.product.title}</p>
														<p className="text-foreground/60 text-xs font-light">{item.variant.title}</p>
														<p className="text-foreground/40 text-xs font-light">{t('quantity', { defaultValue: 'Qty' })}: {item.quantity}</p>
													</div>
												</div>
												<p className="text-foreground font-medium">
													{symbol}{(unit * item.quantity).toFixed(2)}
												</p>
											</div>
										);
									})}
								</div>

								<div className="space-y-2 pt-4 border-t border-foreground/10">
									<div className="flex justify-between text-foreground/60 font-light">
										<span>{t('subtotal')}</span>
										<span>{symbol}{subtotalMajor.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-foreground/60 font-light">
										<span>{t('shipping')} ({t(shippingMethod)})</span>
										<span>{symbol}{shippingMajor.toFixed(2)}</span>
									</div>
									<div className="flex justify-between text-foreground font-normal text-xl pt-2 mt-2 border-t border-foreground/10">
										<span>{t('total')}</span>
										<span className="text-mango-400">{symbol}{totalMajor.toFixed(2)}</span>
									</div>
								</div>

								{step === 'payment' && (
									<p className="text-xs text-foreground/40 mt-4 font-light">
										{t('secure')}
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
