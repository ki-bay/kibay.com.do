import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { initializeCheckout } from '@/api/EcommerceApi';
import { useToast } from '@/components/ui/use-toast';

const ShoppingCart = ({ isCartOpen, setIsCartOpen }) => {
  const { toast } = useToast();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Your cart is empty',
        description: 'Add some products to your cart before checking out.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const items = cartItems.map(item => ({
        variant_id: item.variant.id,
        quantity: item.quantity,
      }));

      const successUrl = `${window.location.origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = window.location.href;

      const { url } = await initializeCheckout({ items, successUrl, cancelUrl });

      // Note: We don't clear cart here immediately if using Stripe hosted checkout, 
      // but if we redirect, we rely on the success page to clear it.
      // However, for this flow we are redirecting.
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast({
        title: 'Checkout Error',
        description: 'There was a problem initializing checkout. Please try again.',
        variant: 'destructive',
      });
    }
  }, [cartItems, toast]);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50"
            onClick={() => setIsCartOpen(false)}
          />
          
          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[51] flex flex-col border-l border-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#D4A574]" />
                <h2 className="text-xl font-serif font-medium text-stone-900">Your Cart</h2>
              </div>
              <Button 
                onClick={() => setIsCartOpen(false)} 
                variant="ghost" 
                size="icon" 
                className="text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-grow p-6 overflow-y-auto bg-stone-50/50">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-500 text-lg">Your cart is currently empty.</p>
                  <Button 
                    onClick={() => setIsCartOpen(false)}
                    variant="link" 
                    className="text-[#D4A574] font-medium"
                  >
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map(item => (
                    <motion.div 
                      layout
                      key={item.variant.id} 
                      className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-100"
                    >
                      <div className="w-20 h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={item.product.image} 
                          alt={item.product.title} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-stone-900 line-clamp-1">{item.product.title}</h3>
                            <button 
                              onClick={() => removeFromCart(item.variant.id)}
                              className="text-stone-300 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-stone-500 mb-2">{item.variant.title}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="font-serif font-medium text-[#D4A574]">
                            {item.variant.sale_price_formatted || item.variant.price_formatted}
                          </p>
                          
                          <div className="flex items-center bg-stone-100 rounded-full p-1">
                            <button 
                              onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-[#D4A574] transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-stone-700">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-stone-600 shadow-sm hover:text-[#D4A574] transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 bg-white border-t border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="text-2xl font-serif font-medium text-stone-900">{getCartTotal()}</span>
                </div>
                <Button 
                  onClick={handleCheckout} 
                  className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white font-medium py-6 rounded-full text-lg shadow-lg shadow-[#D4A574]/20 group transition-all duration-300"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-center text-xs text-stone-400 mt-4">
                  Shipping and taxes calculated at checkout.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShoppingCart;