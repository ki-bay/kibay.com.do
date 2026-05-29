import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Loader2, Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import { getProducts, getProductQuantities } from '@/api/EcommerceApi';
import { resolveProductMediaUrl } from '@/config/mediaCdn';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2E4YTJhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

// ---------------------------------------------------------------------------
// Regular product card — used for wines, bottles, anything you can ship.
// ---------------------------------------------------------------------------
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
    <m.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group flex flex-col"
    >
      <Link to={productHref} className="block h-full flex flex-col">
        <div className="relative w-full h-72 overflow-hidden rounded-2xl bg-card mb-6 shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
          <img
            src={resolveProductMediaUrl(product.image) || placeholderImage}
            alt={`${product.title} — Kibay Caribbean wine`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          {product.ribbon_text && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
              {product.ribbon_text}
            </div>
          )}
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
    </m.div>
  );
};

// ---------------------------------------------------------------------------
// Experience card — for excursions / day passes / things you reserve.
// Wider layout, longer subtitle, no "Add to cart" (book-style CTA instead),
// gracefully handles "by consumption" pricing.
// ---------------------------------------------------------------------------
const ExperienceCard = ({ product, index, lang }) => {
  const { t } = useTranslation('shop');
  const productHref = `/product/${product.slug || product.id}`;

  const v = product.variants?.[0];
  const cents = lang === 'en' ? v?.price_usd_cents : v?.price_dop_cents;
  const byConsumption = !!product.metadata?.price_by_consumption;
  const symbol = lang === 'en' ? 'US$' : 'RD$';
  const priceLabel = byConsumption
    ? (lang === 'en' ? 'By consumption' : 'Por consumo')
    : (cents != null && cents > 0)
      ? `${symbol}${(cents / 100).toFixed(0)}`
      : null;
  const taxesNote = lang === 'en' ? product.metadata?.taxes_note_en : product.metadata?.taxes_note_es;
  const durationMin = product.metadata?.duration_minutes;
  const durationLabel = durationMin
    ? (durationMin >= 60
        ? `${Math.round(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
        : `${durationMin}m`)
    : product.metadata?.hours || null;

  return (
    <m.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <Link
        to={productHref}
        className="flex flex-col sm:flex-row bg-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border border-foreground/5 hover:border-orange-500/30 h-full"
      >
        {/* Image */}
        <div className="relative w-full sm:w-2/5 aspect-[4/3] sm:aspect-auto overflow-hidden bg-background/30">
          <img
            src={resolveProductMediaUrl(product.image) || placeholderImage}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Body */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4A574] font-medium mb-2">
            {lang === 'en' ? 'Experience at Ocoa Bay' : 'Experiencia en Ocoa Bay'}
          </div>
          <h3 className="text-xl sm:text-2xl font-serif text-foreground mb-2 group-hover:text-orange-500 transition-colors leading-tight">
            {product.title}
          </h3>
          {product.subtitle && (
            <p className="text-sm text-foreground/60 leading-relaxed mb-4">{product.subtitle}</p>
          )}

          {/* meta chips */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/50 mb-5">
            {durationLabel && (
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{durationLabel}</span>
            )}
            {product.metadata?.booking_required && (
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{lang === 'en' ? 'Reservation only' : 'Solo con reservación'}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Bahía de Ocoa</span>
          </div>

          {/* Price + CTA — pinned to bottom */}
          <div className="mt-auto flex items-end justify-between gap-4 pt-4 border-t border-foreground/5">
            <div>
              {priceLabel && (
                <div className="text-lg font-medium text-foreground">
                  {priceLabel}
                  {!byConsumption && cents > 0 && (
                    <span className="text-xs font-light text-foreground/50 ml-1">
                      {lang === 'en' ? '/ person' : '/ persona'}
                    </span>
                  )}
                </div>
              )}
              {taxesNote && !byConsumption && (
                <div className="text-[10px] text-foreground/40 mt-0.5">{taxesNote}</div>
              )}
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 group-hover:gap-3 transition-all">
              {lang === 'en' ? 'View experience' : 'Ver experiencia'}
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    </m.div>
  );
};

// ---------------------------------------------------------------------------
// ProductsList: splits the catalog into two sections (wines + experiences)
// so excursions don't clash visually with "add to cart" bottle cards.
// ---------------------------------------------------------------------------
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
        const productIds = allProducts.map((p) => p.id);
        const quantitiesResponse = await getProductQuantities({
          fields: 'inventory_quantity',
          product_ids: productIds,
        });
        const variantQuantityMap = new Map();
        if (quantitiesResponse && quantitiesResponse.variants) {
          quantitiesResponse.variants.forEach((variant) => {
            variantQuantityMap.set(variant.id, variant.inventory_quantity);
          });
        }
        const productsWithQuantities = allProducts.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            inventory_quantity: variantQuantityMap.get(variant.id) ?? variant.inventory_quantity,
          })),
        }));
        setProducts(productsWithQuantities);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProductsWithQuantities();
  }, [i18n.language]);

  const { wines, experiences } = useMemo(() => {
    const wines = [];
    const experiences = [];
    for (const p of products) {
      if (p.type === 'experience') experiences.push(p);
      else wines.push(p);
    }
    return { wines, experiences };
  }, [products]);

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
    <div className="space-y-20">
      {/* Wines */}
      {wines.length > 0 && (
        <section>
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-light text-foreground">
              {i18n.language === 'en' ? 'Wines & Sparkling' : 'Vinos & Espumantes'}
            </h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
              {i18n.language === 'en'
                ? 'Every bottle is born at Bahía de Ocoa. Visit the vineyard to taste all four, book a day at Casa Club, or order any bottle here — shipped straight from the winery.'
                : 'Cada botella nace en Bahía de Ocoa. Visita el viñedo para catarlos todos, reserva un día en Casa Club o pide cualquier botella aquí — enviada directamente desde la bodega.'}
            </p>
            <div className="w-16 h-0.5 bg-[#D4A574] mt-3"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {wines.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Experiences */}
      {experiences.length > 0 && (
        <section>
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-light text-foreground">
              {i18n.language === 'en' ? 'Experiences at Ocoa Bay' : 'Experiencias en Ocoa Bay'}
            </h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
              {i18n.language === 'en'
                ? 'Visit the winery — tastings, full-day stays, and Casa Club access. Reservation only.'
                : 'Visita la bodega — catas, días completos y acceso al Casa Club. Solo con reservación previa.'}
            </p>
            <div className="w-16 h-0.5 bg-[#D4A574] mt-3"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {experiences.map((product, index) => (
              <ExperienceCard key={product.id} product={product} index={index} lang={i18n.language} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductsList;
