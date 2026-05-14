import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart, cartItemKey } from '@/hooks/useCart';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { computeShippingMajor, tiersFromShippingRates } from '@/lib/shipping';

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

			// Stripe webhook owns the orders.status='paid' flip. The client
			// just navigates; the success page polls until the webhook lands.
			if (paymentIntent && paymentIntent.status === 'succeeded') {
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

	// Coupon state.
	// `appliedCoupon` is the validated coupon being applied to the current
	// cart preview (validate_coupon RPC). It is re-confirmed atomically via
	// redeem_coupon at order-INSERT time, which is the source of truth.
	const [couponInput, setCouponInput] = useState('');
	const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountAmount, couponId }
	const [couponError, setCouponError] = useState(null);
	const [couponValidating, setCouponValidating] = useState(false);

	// Shipping tiers loaded from the shipping_rates table; falls back to
	// the lib defaults if the fetch fails. Major-units shape.
	const [shippingTiers, setShippingTiers] = useState(null);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { data, error } = await supabase.from('shipping_rates').select('*');
			if (cancelled) return;
			if (!error && data?.length) setShippingTiers(tiersFromShippingRates(data));
		})();
		return () => {
			cancelled = true;
		};
	}, []);

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
	const cartCurrency = cartItems[0]?.variant?.currency || 'DOP';
	const symbol = symbolFor(cartCurrency);

	// Experiences (excursions / day passes) are not shipped — the customer
	// shows up at Ocoa Bay on the reservation date. Skip the shipping selector
	// and the shipping cost entirely when the cart contains ONLY experiences.
	const cartIsAllExperience = useMemo(
		() => cartItems.length > 0 && cartItems.every((item) => item.product?.type === 'experience'),
		[cartItems],
	);

	// Shippable bottle count: sum of qty across physical-type cart items.
	// Experiences contribute 0. The new per-bottle rate function uses this
	// (RD$200 first bottle + RD$100 each additional, capped at RD$1,600).
	const shippableBottleCount = useMemo(
		() =>
			cartItems.reduce((sum, item) => {
				if (item.product?.type === 'experience') return sum;
				return sum + (Number(item.quantity) || 0);
			}, 0),
		[cartItems],
	);

	const shippingMajor = useMemo(
		() => computeShippingMajor(shippableBottleCount, shippingMethod, cartCurrency, shippingTiers),
		[shippableBottleCount, shippingMethod, cartCurrency, shippingTiers],
	);
	const subtotalCents = Math.round(subtotalMajor * 100);
	const shippingCents = Math.round(shippingMajor * 100);
	const discountCents = appliedCoupon ? Math.max(0, Number(appliedCoupon.discountAmount) || 0) : 0;
	const discountMajor = discountCents / 100;
	// Clamp at 0 in the (unlikely) case discount exceeds subtotal+shipping.
	const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);
	const totalMajor = totalCents / 100;

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

	const handleApplyCoupon = async () => {
		const code = couponInput.trim().toUpperCase();
		if (!code) {
			setCouponError('Enter a coupon code.');
			return;
		}
		setCouponValidating(true);
		setCouponError(null);
		try {
			const { data, error } = await supabase.rpc('validate_coupon', {
				p_code: code,
				p_subtotal: subtotalCents,
				p_currency: cartCurrency,
			});
			if (error) throw new Error(error.message);
			// RPC returns a single row; supabase-js may surface as object or
			// 1-element array depending on definition.
			const row = Array.isArray(data) ? data[0] : data;
			if (!row || !row.valid) {
				setAppliedCoupon(null);
				setCouponError(row?.error || 'Invalid coupon code.');
				return;
			}
			setAppliedCoupon({
				code,
				discountAmount: Number(row.discount_amount) || 0,
				couponId: row.coupon_id,
			});
			setCouponError(null);
		} catch (err) {
			console.error('validate_coupon failed:', err);
			setAppliedCoupon(null);
			setCouponError(err.message || 'Could not validate coupon.');
		} finally {
			setCouponValidating(false);
		}
	};

	const handleRemoveCoupon = () => {
		setAppliedCoupon(null);
		setCouponError(null);
		setCouponInput('');
	};

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

		// Re-validate inventory at checkout time. The cart enforces stock at
		// add-time, but stock can drop between add and checkout (other buyers,
		// admin adjustments). Bail if any tracked variant is now insufficient.
		try {
			const trackedIds = cartItems
				.filter((item) => item.variant?.id && item.variant?.manage_inventory !== false)
				.map((item) => item.variant.id);
			if (trackedIds.length > 0) {
				const { data: stockRows, error: stockErr } = await supabase
					.from('product_variants')
					.select('id, inventory_quantity, manage_inventory, title_es, title_en')
					.in('id', trackedIds);
				if (stockErr) throw new Error(stockErr.message);
				const stockById = new Map((stockRows || []).map((r) => [r.id, r]));
				for (const item of cartItems) {
					const row = stockById.get(item.variant?.id);
					if (!row || row.manage_inventory === false) continue;
					const available = Number(row.inventory_quantity) || 0;
					if (item.quantity > available) {
						const name = row.title_es || row.title_en || item.product?.title || 'item';
						setInitError(
							`"${name}" only has ${available} in stock — please update your cart.`,
						);
						setLoading(false);
						return;
					}
				}
			}
		} catch (stockCheckErr) {
			console.error('Inventory recheck failed:', stockCheckErr);
			setInitError('Unable to verify inventory. Please try again.');
			setLoading(false);
			return;
		}

		// Atomically redeem the coupon (if any) just before creating the order.
		// We trust redeem_coupon's discount_amount over the preview because the
		// subtotal might have shifted between Apply and Continue.
		let finalDiscountCents = 0;
		let finalCouponCode = null;
		if (appliedCoupon) {
			try {
				const { data: redeemData, error: redeemError } = await supabase.rpc('redeem_coupon', {
					p_code: appliedCoupon.code,
					p_subtotal: subtotalCents,
					p_currency: cartCurrency,
				});
				if (redeemError) throw new Error(redeemError.message);
				const redeemRow = Array.isArray(redeemData) ? redeemData[0] : redeemData;
				if (!redeemRow || !redeemRow.valid) {
					// Race: coupon hit max_uses or otherwise became invalid.
					setAppliedCoupon(null);
					setCouponError(
						redeemRow?.error || 'Coupon could no longer be applied. Please try again.',
					);
					setLoading(false);
					return;
				}
				finalDiscountCents = Math.max(0, Number(redeemRow.discount_amount) || 0);
				finalCouponCode = appliedCoupon.code;
			} catch (redeemCatchErr) {
				console.error('redeem_coupon failed:', redeemCatchErr);
				setAppliedCoupon(null);
				setCouponError(redeemCatchErr.message || 'Could not redeem coupon.');
				setLoading(false);
				return;
			}
		}

		// Recompute totals using the authoritative discount from redeem_coupon.
		const finalTotalCents = Math.max(0, subtotalCents + shippingCents - finalDiscountCents);
		const finalTotalMajor = finalTotalCents / 100;

		const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

		let createdOrderId = null;
		try {
			const { data: orderData, error: orderError } = await supabase
				.from('orders')
				.insert({
					user_id: user.id,
					order_number: orderNumber,
					status: 'awaiting_payment',
					total_amount: finalTotalCents,
					subtotal_amount: subtotalCents,
					shipping_amount: shippingCents,
					discount_amount: finalDiscountCents,
					coupon_code: finalCouponCode,
					currency: cartCurrency,
					items_count: cartItems.length,
					shipping_address: shippingInfo,
					shipping_method: cartIsAllExperience ? 'pickup' : shippingMethod,
					tax_id: shippingInfo.taxId || null,
					payment_method: 'Stripe',
					// All-experiences orders have no physical delivery — the
					// "delivery date" is the reservation date on each line item.
					estimated_delivery_date: cartIsAllExperience
						? null
						: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
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
				// Per-line metadata. Wine bottles ship with {}; experiences carry
				// { reservation_date, reservation_time } set at /product/:slug add-to-cart.
				metadata: item.metadata || {},
			}));

			const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
			if (itemsError) throw new Error(itemsError.message);

			const { data, error } = await supabase.functions.invoke('create-payment-intent', {
				body: {
					amount: finalTotalMajor,
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
				<meta name="robots" content="noindex,follow" />
			</Helmet>

			<Navigation />

			<main id="main" role="main" className="min-h-screen bg-background pt-28 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<h1 className="text-3xl font-light text-foreground mb-8">{t('title')}</h1>

					<div className="grid lg:grid-cols-2 gap-12">
						<div className="space-y-8">
							<div className="bg-card p-6 rounded-xl border border-foreground/10">
								<h2 className="text-xl font-normal text-foreground mb-6">{t('shippingAddress')}</h2>
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<label htmlFor="checkout-firstName" className="text-sm font-light text-foreground/80">{t('fields.firstName')}</label>
											<input
												id="checkout-firstName"
												name="firstName"
												autoComplete="given-name"
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
											<label htmlFor="checkout-lastName" className="text-sm font-light text-foreground/80">{t('fields.lastName')}</label>
											<input
												id="checkout-lastName"
												name="lastName"
												autoComplete="family-name"
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
										<label htmlFor="checkout-email" className="text-sm font-light text-foreground/80">{t('email')}</label>
										<input
											id="checkout-email"
											name="email"
											autoComplete="email"
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
										<label htmlFor="checkout-taxId" className="text-sm font-light text-foreground/80">{t('taxId')}</label>
										<input
											id="checkout-taxId"
											name="taxId"
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
										<label htmlFor="checkout-address" className="text-sm font-light text-foreground/80">{t('address')}</label>
										<input
											id="checkout-address"
											name="address"
											autoComplete="street-address"
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
											<label htmlFor="checkout-city" className="text-sm font-light text-foreground/80">{t('city')}</label>
											<input
												id="checkout-city"
												name="city"
												autoComplete="address-level2"
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
											<label htmlFor="checkout-phone" className="text-sm font-light text-foreground/80">{t('phone')}</label>
											<input
												id="checkout-phone"
												name="phone"
												autoComplete="tel"
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

									{shippableBottleCount === 0 ? (
										<div className="space-y-2 bg-mango-500/5 border border-mango-500/20 rounded-lg p-4">
											<div className="text-sm font-medium text-mango-300">
												{cartCurrency === 'USD'
													? 'Reservation — no shipping'
													: 'Reservación — sin envío'}
											</div>
											<p className="text-xs text-foreground/60 font-light">
												{cartCurrency === 'USD'
													? "You'll receive your reservation confirmation by email. Just show up at Bahía de Ocoa on the date you picked."
													: 'Recibirás la confirmación de tu reserva por correo. Solo tienes que llegar a Bahía de Ocoa el día que elegiste.'}
											</p>
										</div>
									) : (
										<div className="space-y-2">
											<label htmlFor="checkout-shippingMethod" className="text-sm font-light text-foreground/80">{t('shippingMethod')}</label>
											<select
												id="checkout-shippingMethod"
												name="shippingMethod"
												value={shippingMethod}
												onChange={(e) => setShippingMethod(e.target.value)}
												disabled={step === 'payment'}
												className="w-full bg-background/50 border border-foreground/10 rounded-lg p-3 text-foreground focus:border-mango-500 focus:outline-none font-light"
											>
												<option value="standard">{t('standard')} ({symbol}{shippingMajor.toFixed(2)})</option>
												<option value="express">{t('express')} ({symbol}{computeShippingMajor(shippableBottleCount, 'express', cartCurrency, shippingTiers).toFixed(2)})</option>
											</select>
											<p className="text-xs text-foreground/50 font-light">
												{cartCurrency === 'USD'
													? `${shippableBottleCount} bottle${shippableBottleCount === 1 ? '' : 's'} · +${symbol}2 each additional up to 11; 12+ bottles flat ${symbol}30`
													: `${shippableBottleCount} botella${shippableBottleCount === 1 ? '' : 's'} · +RD$100 por cada botella adicional hasta 11; 12+ botellas tarifa fija RD$1,600`}
											</p>
										</div>
									)}
								</div>

								{step === 'shipping' && (
									<div className="mt-6 pt-6 border-t border-foreground/10">
										<label htmlFor="checkout-coupon" className="text-sm font-light text-foreground/80 block mb-2">
											Coupon code
										</label>
										{appliedCoupon ? (
											<div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
												<div className="flex items-center gap-2 text-emerald-300 text-sm">
													<CheckCircle className="w-4 h-4 flex-shrink-0" />
													<span className="font-normal">{appliedCoupon.code}</span>
													<span className="font-light text-foreground/70">
														Saved {symbol}{(appliedCoupon.discountAmount / 100).toFixed(2)}
													</span>
												</div>
												<button
													type="button"
													onClick={handleRemoveCoupon}
													className="text-xs text-foreground/60 hover:text-foreground underline font-light"
												>
													Remove
												</button>
											</div>
										) : (
											<>
												<div className="flex gap-2">
													<Input
														id="checkout-coupon"
														name="coupon"
														type="text"
														value={couponInput}
														onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleApplyCoupon();
															}
														}}
														placeholder=""
														autoComplete="off"
														className="flex-1 uppercase"
													/>
													<Button
														type="button"
														variant="outline"
														onClick={handleApplyCoupon}
														disabled={couponValidating || !couponInput.trim()}
														className="border-foreground/20 text-foreground"
													>
														{couponValidating ? (
															<Loader2 className="w-4 h-4 animate-spin" />
														) : (
															'Apply'
														)}
													</Button>
												</div>
												{couponError && (
													<p className="text-xs text-red-400 mt-2 font-light">{couponError}</p>
												)}
											</>
										)}
									</div>
								)}

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
											((item.variant?.sale_price_in_cents ?? item.variant?.price_in_cents) || 0) / 100;
										const productTitle = item.product?.title || 'Product';
										const variantTitle = item.variant?.title || '';
										return (
											<div
												key={cartItemKey(item) || item.product?.id}
												className="flex justify-between items-center py-2 border-b border-foreground/5 last:border-0"
											>
												<div className="flex items-center gap-4">
													<div className="w-12 h-12 bg-background rounded overflow-hidden">
														{item.product?.image ? (
															<img
																src={item.product.image}
																alt={productTitle}
																className="w-full h-full object-cover"
															/>
														) : null}
													</div>
													<div>
														<p className="text-foreground font-medium text-sm">{productTitle}</p>
														{variantTitle && (
															<p className="text-foreground/60 text-xs font-light">{variantTitle}</p>
														)}
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
									{appliedCoupon && discountCents > 0 && (
										<div className="flex justify-between text-emerald-400 font-light">
											<span>Discount ({appliedCoupon.code})</span>
											<span>-{symbol}{discountMajor.toFixed(2)}</span>
										</div>
									)}
									{shippableBottleCount > 0 && (
										<div className="flex justify-between text-foreground/60 font-light">
											<span>{t('shipping')} ({t(shippingMethod)})</span>
											<span>{symbol}{shippingMajor.toFixed(2)}</span>
										</div>
									)}
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
			</main>

			<Footer />
		</>
	);
};

export default CheckoutPage;
