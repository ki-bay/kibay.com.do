import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartContext } from '@/contexts/CartContext';

const CART_STORAGE_KEY = 'kibay_cart';

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

  const addToCart = useCallback((product, variant, quantity, availableQuantity) => {
    return new Promise((resolve, reject) => {
      // Check inventory and apply the mutation inside the same updater so
      // rapid back-to-back calls always see the freshest cart state. Reading
      // `cartItems` from closure would let two concurrent clicks both pass
      // the stock check and overstock the cart.
      let overflowError = null;
      setCartItems(prevItems => {
        if (variant.manage_inventory) {
          const existing = prevItems.find(item => item.variant.id === variant.id);
          const currentQty = existing ? existing.quantity : 0;
          if (currentQty + quantity > availableQuantity) {
            overflowError = new Error(
              `Not enough stock for ${product.title} (${variant.title}). Only ${availableQuantity} left.`
            );
            return prevItems;
          }
        }
        const existing = prevItems.find(item => item.variant.id === variant.id);
        if (existing) {
          return prevItems.map(item =>
            item.variant.id === variant.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prevItems, { product, variant, quantity }];
      });
      queueMicrotask(() => {
        if (overflowError) reject(overflowError);
        else resolve();
      });
    });
  }, []);

  const removeFromCart = useCallback((variantId) => {
    setCartItems(prevItems => prevItems.filter(item => item.variant.id !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId, quantity) => {
    if (quantity < 1) return;
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.variant.id === variantId ? { ...item, quantity } : item
      )
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
    getCartCount
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};