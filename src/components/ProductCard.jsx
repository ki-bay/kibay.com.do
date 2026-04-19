import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import FlyToCartAnimation from '@/components/FlyToCartAnimation';

const ProductCard = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const productImgRef = useRef(null);
  // We don't pass cartRef here because it's hard to get from Navigation.
  // The hook will fallback to document.getElementById('cart-icon-trigger')
  const triggerFlyToCart = useFlyToCart(productImgRef, null);

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    triggerFlyToCart();
    addToCart(product, quantity);
    toast({
      title: "Added to Cart",
      description: `${quantity} x ${product.name} added to your cart.`,
    });
  };

  return (
    <Card className="overflow-hidden bg-slate-800 border-mango-500/20 hover:shadow-2xl hover:shadow-mango-500/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
      <FlyToCartAnimation ref={productImgRef} className="w-full h-72 bg-slate-900/50 overflow-hidden group">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </FlyToCartAnimation>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-normal text-white mb-1">{product.name}</h3>
            <p className="text-sm text-mango-400 font-medium">{product.type}</p>
          </div>
          <span className="text-xl font-normal text-white">
            RD${product.price}
          </span>
        </div>
        
        <p className="text-white/70 text-sm mb-6 line-clamp-2 font-light flex-grow">
          {product.description}
        </p>

        <div className="flex items-center gap-4 mt-auto">
          <div className="flex items-center bg-slate-900 rounded-lg border border-white/10">
            <button
              onClick={handleDecrement}
              className="p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-white font-normal">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              className="p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-mango-500 hover:bg-mango-600 text-white font-normal"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;