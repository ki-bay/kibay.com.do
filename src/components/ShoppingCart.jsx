import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart, cartItemKey } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { resolveProductMediaUrl } from '@/config/mediaCdn';

const symbolFor = (currency) => (String(currency || '').toUpperCase() === 'USD' ? '$' : 'RD$');

const ShoppingCart = ({ isCartOpen, setIsCartOpen }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const { t } = useTranslation('cart');
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const closeCart = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);

  // ESC handler
  useEffect(() => {
    if (!isCartOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeCart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, closeCart]);

  // Focus management: save previously focused element, focus close button on open, restore on close
  useEffect(() => {
    if (isCartOpen) {
      previouslyFocusedRef.current = document.activeElement;
      // Defer focus until after the panel mounts
      const id = window.setTimeout(() => {
        if (closeButtonRef.current) closeButtonRef.current.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
    if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
      previouslyFocusedRef.current.focus();
    }
    previouslyFocusedRef.current = null;
    return undefined;
  }, [isCartOpen]);

  const handleCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      toast({
        title: t('empty'),
        variant: 'destructive',
      });
      return;
    }
    setIsCartOpen(false);
    navigate('/checkout');
  }, [cartItems.length, navigate, setIsCartOpen, toast, t]);

  const symbol = symbolFor(cartItems[0]?.variant?.currency);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
            className="fixed inset-0 bg-card/40 backdrop-blur-sm z-50"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Slide-out Panel */}
          <m.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[51] flex flex-col border-l border-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#D4A574]" aria-hidden="true" />
                <h2 id="cart-title" className="text-xl font-serif font-medium text-foreground">{t('title')}</h2>
              </div>
              <Button
                ref={closeButtonRef}
                onClick={() => setIsCartOpen(false)}
                variant="ghost"
                size="icon"
                aria-label={t('close', { defaultValue: 'Close' })}
                className="text-foreground/50 hover:text-foreground hover:bg-background rounded-full"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow p-6 overflow-y-auto bg-background/50">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-stone-300" aria-hidden="true" />
                  </div>
                  <p className="text-foreground/60 text-lg">{t('empty')}</p>
                  <Button
                    onClick={() => setIsCartOpen(false)}
                    variant="link"
                    className="text-[#D4A574] font-medium"
                  >
                    {t('continueShopping')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map(item => {
                    const itemKey = cartItemKey(item);
                    return (
                    <m.div
                      layout
                      key={itemKey}
                      className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-100"
                    >
                      <div className="w-20 h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={resolveProductMediaUrl(item.product.image) || item.product.image}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-foreground line-clamp-1">{item.product.title}</h3>
                            <button
                              type="button"
                              onClick={() => removeFromCart(itemKey)}
                              aria-label={t('remove', { defaultValue: 'Remove item' })}
                              className="text-stone-300 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="text-sm text-foreground/60 mb-2">{item.variant.title}</p>
                          {item.metadata?.reservation_date && (
                            <p className="text-xs text-[#D4A574] mb-1">
                              {item.metadata.reservation_date}
                              {item.metadata.reservation_time ? ` · ${item.metadata.reservation_time}` : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="font-serif font-medium text-[#D4A574]">
                            {item.variant.sale_price_formatted || item.variant.price_formatted}
                          </p>

                          <div className="flex items-center bg-stone-100 rounded-full p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, Math.max(1, item.quantity - 1))}
                              aria-label={t('decreaseQuantity', { defaultValue: 'Decrease quantity' })}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-foreground/70 shadow-sm hover:text-[#D4A574] transition-colors"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-foreground/90">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                              aria-label={t('increaseQuantity', { defaultValue: 'Increase quantity' })}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-foreground/70 shadow-sm hover:text-[#D4A574] transition-colors"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </m.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 bg-white border-t border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-foreground/60">{t('subtotal')}</span>
                  <span className="text-2xl font-serif font-medium text-foreground">
                    {symbol}{getCartTotal().toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white font-medium py-6 rounded-full text-lg shadow-lg shadow-[#D4A574]/20 group transition-all duration-300"
                >
                  {t('checkout')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Button>
                <p className="text-center text-xs text-foreground/50 mt-4">
                  {t('shippingCalculated')}
                </p>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShoppingCart;