import React, { forwardRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';

const ShoppingCartIcon = forwardRef(({ onClick }, ref) => {
  const { cartItems } = useCart();
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Button
      ref={ref}
      id="cart-icon-trigger"
      variant="ghost"
      size="icon"
      className="relative text-stone-700 hover:text-[#D4A574] hover:bg-[#D4A574]/10 transition-colors"
      onClick={onClick}
      aria-label="Open Cart"
    >
      <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#D4A574] text-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
          {count}
        </span>
      )}
    </Button>
  );
});

ShoppingCartIcon.displayName = 'ShoppingCartIcon';

export default ShoppingCartIcon;