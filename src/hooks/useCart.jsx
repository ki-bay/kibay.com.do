import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartContext } from '@/contexts/CartContext';

const CART_STORAGE_KEY = 'kibay_cart';

// Stable key used to dedupe cart lines. Experience products that carry a
// reservation_date / reservation_time on `metadata` MUST NOT merge with
// other lines that share the variant id but have different reservations —
// otherwise two people booking different Saturdays would collapse into one
// item. The key includes a canonicalized metadata JSON for that reason.
export const cartItemKey = (item) => {
  const variantId = item?.variant?.id ?? '';
  const meta = item?.metadata && typeof item.metadata === 'object' ? item.metadata : null;
  if (!meta || Object.keys(meta).length === 0) return `v:${variantId}`;
  // Stable stringify — sort keys so {a,b} and {b,a} collide.
  const sorted = Object.keys(meta).sort().reduce((acc, k) => {
    acc[k] = meta[k];
    return acc;
  }, {});
  return `v:${variantId}|m:${JSON.stringify(sorted)}`;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.error('Failed to parse cart data:', error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // addToCart(product, variant, quantity, availableQuantity, metadata = {})
  //
  // The optional 5th `metadata` argument lets experience products (reservations)
  // store per-line context — e.g. { reservation_date: '2026-05-24', reservation_time: '11:00' }.
  // Lines with different metadata never merge (see cartItemKey above) so two
  // separate reservations always stay as distinct cart lines.
  const addToCart = useCallback((product, variant, quantity, availableQuantity, metadata = {}) => {
    return new Promise((resolve, reject) => {
      // Check inventory and apply the mutation inside the same updater so
      // rapid back-to-back calls always see the freshest cart state. Reading
      // `cartItems` from closure would let two concurrent clicks both pass
      // the stock check and overstock the cart.
      let overflowError = null;
      const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
      const targetKey = cartItemKey({ variant, metadata: safeMetadata });
      setCartItems(prevItems => {
        if (variant.manage_inventory) {
          // Sum stock against *all* lines sharing this variant id, regardless
          // of metadata. Two reservations for the same variant still consume
          // shared inventory.
          const currentQty = prevItems
            .filter(item => item.variant.id === variant.id)
            .reduce((sum, item) => sum + (item.quantity || 0), 0);
          if (currentQty + quantity > availableQuantity) {
            overflowError = new Error(
              `Not enough stock for ${product.title} (${variant.title}). Only ${availableQuantity} left.`
            );
            return prevItems;
          }
        }
        const existing = prevItems.find(item => cartItemKey(item) === targetKey);
        if (existing) {
          return prevItems.map(item =>
            cartItemKey(item) === targetKey
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prevItems, { product, variant, quantity, metadata: safeMetadata }];
      });
      queueMicrotask(() => {
        if (overflowError) reject(overflowError);
        else resolve();
      });
    });
  }, []);

  const removeFromCart = useCallback((variantIdOrKey) => {
    setCartItems(prevItems => prevItems.filter(item => {
      // Back-compat: callers that pass a bare variant id should still remove
      // a line that matches that variant (only safe when there's one line for it).
      if (item.variant.id === variantIdOrKey) return false;
      if (cartItemKey(item) === variantIdOrKey) return false;
      return true;
    }));
  }, []);

  const updateQuantity = useCallback((variantIdOrKey, quantity) => {
    if (quantity < 1) return;
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.variant.id === variantIdOrKey || cartItemKey(item) === variantIdOrKey) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    const totalCents = cartItems.reduce((total, item) => {
      const price = item.variant.sale_price_in_cents ?? item.variant.price_in_cents;
      return total + (price * item.quantity);
    }, 0);
    return totalCents / 100;
  }, [cartItems]);

  const getCartCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    cartItemKey,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
