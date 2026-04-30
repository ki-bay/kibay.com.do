import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import { getProducts, getProductQuantities } from '@/api/EcommerceApi';
import { resolveProductMediaUrl } from '@/config/mediaCdn';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2E4YTJhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation('shop');

  const displayVariant = useMemo(() => product.variants[0], [product]);
  const hasSale = useMemo(() => displayVariant && displayVariant.sale_price_in_cents !== null, [displayVariant]);
  const displayPrice = useMemo(() => hasSale ? displayVariant.sale_price_formatted : displayVariant.price_formatted, [displayVariant, hasSale]);
  const originalPrice = useMemo(() => hasSale ? displayVariant.price_formatted : null, [displayVariant, hasSale]);

  const productHref = `/product/${product.slug || product.id}`;

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If product has multiple variants, go to detail page to select
    if (product.variants.length > 1) {
      navigate(productHref);
      return;
    }

    const defaultVariant = product.variants[0];

    try {
      await addToCart(product, defaultVariant, 1, defaultVariant.inventory_quantity);
      toast({
        title: t('list.addToCart'),
        description: product.title,
        className: "bg-card text-foreground border-orange-500/20",
      });
    } catch (error) {
      toast({
        title: t('list.outOfStock'),
        description: error.message,
        variant: "destructive",
      });
    }
  }, [product, addToCart, toast, navigate, productHref, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group flex flex-col" // Add flex flex-col here to ensure consistent card height
    >
      <Link to={productHref} className="block h-full flex flex-col">
        <div className="relative w-full h-72 overflow-hidden rounded-2xl bg-card mb-6 shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
          <img
            src={resolveProductMediaUrl(product.image) || placeholderImage}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

          {/* Badge */}
          {product.ribbon_text && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
              {product.ribbon_text}
            </div>
          )}

          {/* Quick Add Button Overlay */}
          <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              onClick={handleAddToCart}
              size="icon"
              aria-label={t('list.addToCart')}
              className="rounded-full w-12 h-12 bg-background text-foreground hover:bg-orange-500 hover:text-white shadow-lg border-none transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-grow flex flex-col justify-between space-y-2 p-4 bg-background/50 rounded-xl border border-foreground/5 hover:border-orange-500/20 transition-colors">
          <div>
            <h3 className="text-xl font-bold text-foreground group-hover:text-orange-500 transition-colors">{product.title}</h3>
            {product.subtitle && <p className="text-sm text-foreground/50 line-clamp-1 h-5">{product.subtitle}</p>}
          </div>
          <div className="flex items-baseline gap-2 pt-1 mt-auto">
            <span className="text-lg font-medium text-foreground/90">{displayPrice}</span>
            {hasSale && (
              <span className="text-sm text-slate-500 line-through decoration-slate-500/50">{originalPrice}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, i18n } = useTranslation('shop');

  useEffect(() => {
    const fetchProductsWithQuantities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch ALL products without filtering. 
        const productsResponse = await getProducts({ limit: 100 });

        if (!productsResponse || !productsResponse.products) {
          setProducts([]);
          return;
        }

        const allProducts = productsResponse.products;
        
        if (allProducts.length === 0) {
           setProducts([]);
           setLoading(false);
           return;
        }

        const productIds = allProducts.map(product => product.id);

        const quantitiesResponse = await getProductQuantities({
          fields: 'inventory_quantity',
          product_ids: productIds
        });

        const variantQuantityMap = new Map();
        if (quantitiesResponse && quantitiesResponse.variants) {
           quantitiesResponse.variants.forEach(variant => {
             variantQuantityMap.set(variant.id, variant.inventory_quantity);
           });
        }

        const productsWithQuantities = allProducts.map(product => ({
          ...product,
          variants: product.variants.map(variant => ({
            ...variant,
            inventory_quantity: variantQuantityMap.get(variant.id) ?? variant.inventory_quantity
          }))
        }));

        setProducts(productsWithQuantities);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProductsWithQuantities();
  }, [i18n.language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-8 bg-red-900/20 rounded-xl max-w-2xl mx-auto my-12 border border-red-900/50">
        <p>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center text-foreground/60 py-20">
        <p className="text-lg font-light mb-4">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};

export default ProductsList;