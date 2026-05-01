import React from 'react';
import { useCart } from '@/hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { resolveProductMediaUrl } from '@/config/mediaCdn';

const symbolFor = (currency) => (String(currency || '').toUpperCase() === 'USD' ? '$' : 'RD$');

const Cart = () => {
	const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
	const navigate = useNavigate();
	const { t } = useTranslation('cart');

	if (cartItems.length === 0) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
				<div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-6">
					<ShoppingBag className="w-10 h-10 text-foreground/30" />
				</div>
				<h2 className="text-2xl font-bold text-foreground mb-2">{t('empty')}</h2>
				<Button onClick={() => navigate('/shop')} className="bg-mango-500 hover:bg-mango-600 text-white">
					{t('continueShopping')}
				</Button>
			</div>
		);
	}

	const symbol = symbolFor(cartItems[0]?.variant?.currency);

	return (
		<div className="max-w-4xl mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold text-foreground mb-8">{t('title')}</h1>

			<div className="bg-card rounded-xl border border-foreground/10 overflow-hidden mb-8">
				<div className="divide-y divide-white/10">
					{cartItems.map((item) => {
						const unitMajor =
							(item.variant.sale_price_in_cents ?? item.variant.price_in_cents) / 100;
						const img = resolveProductMediaUrl(item.product.image) || item.product.image;
						return (
							<motion.div
								key={item.variant.id}
								layout
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="p-6 flex flex-col sm:flex-row items-center gap-6"
							>
								<div className="w-24 h-24 bg-background rounded-lg overflow-hidden flex-shrink-0">
									<img src={img} alt={item.product.title} className="w-full h-full object-cover" />
								</div>

								<div className="flex-1 text-center sm:text-left">
									<h3 className="text-lg font-bold text-foreground mb-1">{item.product.title}</h3>
									<p className="text-mango-400 text-sm mb-2">{item.variant.title}</p>
									<p className="text-foreground/60 text-sm">{symbol}{unitMajor.toFixed(2)}</p>
								</div>

								<div className="flex items-center gap-4">
									<div className="flex items-center bg-background rounded-lg border border-foreground/10">
										<button
											type="button"
											aria-label={t('decrease')}
											onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
											className="p-2 text-foreground/70 hover:text-foreground transition-colors"
											disabled={item.quantity <= 1}
										>
											<Minus className="w-4 h-4" />
										</button>
										<span className="w-8 text-center text-foreground font-medium">{item.quantity}</span>
										<button
											type="button"
											aria-label={t('increase')}
											onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
											className="p-2 text-foreground/70 hover:text-foreground transition-colors"
										>
											<Plus className="w-4 h-4" />
										</button>
									</div>

									<div className="text-right min-w-[100px]">
										<p className="text-lg font-bold text-foreground">
											{symbol}{(unitMajor * item.quantity).toFixed(2)}
										</p>
									</div>

									<Button
										variant="ghost"
										size="icon"
										aria-label={t('remove')}
										onClick={() => removeFromCart(item.variant.id)}
										className="text-foreground/40 hover:text-red-400 hover:bg-red-400/10"
									>
										<Trash2 className="w-5 h-5" />
									</Button>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-card p-6 rounded-xl border border-foreground/10">
				<Button
					variant="ghost"
					onClick={clearCart}
					className="text-foreground/60 hover:text-red-400"
				>
					{t('remove')}
				</Button>

				<div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
					<div className="text-center sm:text-right">
						<p className="text-foreground/60 text-sm">{t('subtotal')}</p>
						<p className="text-3xl font-bold text-foreground">{symbol}{getCartTotal().toFixed(2)}</p>
					</div>

					<Button
						onClick={() => navigate('/checkout')}
						className="w-full sm:w-auto bg-mango-500 hover:bg-mango-600 text-white px-8 py-6 text-lg"
					>
						{t('checkout')} <ArrowRight className="ml-2 w-5 h-5" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default Cart;
