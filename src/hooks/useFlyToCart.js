import { useCallback } from 'react';

export const useFlyToCart = (productImageRef, cartIconRef) => {
  const animate = useCallback(() => {
    // 1. Resolve elements
    const imgEl = productImageRef?.current;
    
    // Fallback to finding cart by ID if ref is not provided or null
    let cartEl = cartIconRef?.current;
    if (!cartEl) {
      cartEl = document.getElementById('cart-icon-trigger');
    }

    if (!imgEl || !cartEl) {
      console.warn('FlyToCart: Missing elements', { imgEl, cartEl });
      return;
    }

    // 2. Get Coordinates
    const imgRect = imgEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();

    // 3. Create Clone
    const clone = imgEl.cloneNode(true);
    
    // Apply initial styles to clone to match source position perfectly
    clone.style.position = 'fixed';
    clone.style.top = `${imgRect.top}px`;
    clone.style.left = `${imgRect.left}px`;
    clone.style.width = `${imgRect.width}px`;
    clone.style.height = `${imgRect.height}px`;
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none'; // Ensure click-through
    clone.style.borderRadius = '0.5rem'; // Match typical card rounding
    clone.style.transition = 'none'; // Disable CSS transitions on the clone itself initially

    document.body.appendChild(clone);

    // 4. Calculate DelTas for translation
    // We want the center of the image to fly to the center of the cart icon
    const startX = imgRect.left + imgRect.width / 2;
    const startY = imgRect.top + imgRect.height / 2;
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // 5. Animate using Web Animations API
    const animation = clone.animate([
      { 
        transform: 'translate(0, 0) scale(1)',
        opacity: 1 
      },
      { 
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.1)`,
        opacity: 0.2 
      }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // Ease-in-out feeling
      fill: 'forwards'
    });

    // 6. Handle Completion
    animation.onfinish = () => {
      clone.remove();
      
      // Trigger Cart Pulse/Shake
      cartEl.classList.remove('animate-cart-pulse', 'animate-cart-shake');
      // Trigger reflow to restart animation
      void cartEl.offsetWidth;
      cartEl.classList.add('animate-cart-pulse');
      
      // Remove class after animation
      setTimeout(() => {
        cartEl.classList.remove('animate-cart-pulse');
      }, 400);
    };

  }, [productImageRef, cartIconRef]);

  return animate;
};