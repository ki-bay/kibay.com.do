import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getProduct, getProductQuantities } from '@/api/EcommerceApi';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Loader2, ArrowLeft, CheckCircle, Minus, Plus, AlertCircle,
  ShoppingBag, ArrowDown, Sun, Wine, Sparkles, Leaf, Calendar,
} from 'lucide-react';
import NewsletterSignup from '@/components/NewsletterSignup';
import SEOHead from '@/components/SEOHead';
import SchemaMarkup from '@/components/SchemaMarkup';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductReviews from '@/components/ProductReviews';
import RelatedProducts from '@/components/RelatedProducts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2E4YTJhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

// Pick a metadata value by language using the _es / _en suffix convention.
function pickLocalized(obj, baseKey, lang) {
  if (!obj) return undefined;
  const suffix = lang === 'en' ? '_en' : '_es';
  const fallback = lang === 'en' ? '_es' : '_en';
  return obj[`${baseKey}${suffix}`] ?? obj[`${baseKey}${fallback}`] ?? obj[baseKey];
}

// Split a hero title into lead + accent for the editorial treatment.
// Honors metadata.title_accent_{es,en} first, then a " — " em-dash split,
// otherwise returns the full title as the lead with no accent.
function splitHeroTitle(title, metadata, lang) {
  const accentOverride = pickLocalized(metadata, 'title_accent', lang);
  if (accentOverride && title?.toLowerCase().endsWith(String(accentOverride).toLowerCase())) {
    const lead = title.slice(0, title.length - accentOverride.length).trim();
    return { lead: lead || title, accent: accentOverride };
  }
  if (accentOverride) {
    return { lead: title, accent: accentOverride };
  }
  if (typeof title === 'string' && title.includes(' — ')) {
    const [lead, ...rest] = title.split(' — ');
    return { lead, accent: rest.join(' — ') };
  }
  return { lead: title, accent: '' };
}

// Strip basic HTML and pull the first paragraph for a hero lead fallback.
function firstParagraph(html) {
  if (!html) return '';
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const raw = match ? match[1] : html;
  return raw.replace(/<[^>]+>/g, '').trim();
}

// Tasting cards icon roster — index by order of keys we render.
const TASTING_ICONS = [Sun, Wine, Sparkles, Leaf];

function ProductDetailPage() {
  const { slug, id } = useParams();
  const productKey = slug || id;
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('product');
  const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewAggregate, setReviewAggregate] = useState(null);
  // Reservation state — only relevant when product is an experience.
  // Stored as 'YYYY-MM-DD' (date) and 'HH:MM' (24h, AST) strings.
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Product.type is delivered as { value: 'experience' } by EcommerceApi.mapProduct.
  // The raw products row column is also `type` (string), so callers querying
  // supabase directly use the flat form. We accept either to be safe.
  const productTypeValue =
    typeof product?.type === 'string' ? product.type : product?.type?.value || '';
  const isExperience = productTypeValue === 'experience';
  const timeslots = Array.isArray(product?.metadata?.timeslots)
    ? product.metadata.timeslots
    : [];
  // Any experience that declares a `timeslots` array in metadata gets the
  // time picker. Casa Club Day Pass has no timeslots → defaults to 11:00 AM.
  const needsTimePicker = isExperience && timeslots.length > 0;
  // Min reservation date = today. Same-day and next-day bookings are allowed
  // (Ocoa Bay confirms by phone if the window is tight). YYYY-MM-DD format.
  const minReservationDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // Initialize default time when a timeslot picker is needed.
  useEffect(() => {
    if (needsTimePicker && !reservationTime) {
      setReservationTime(timeslots[0]);
    } else if (!needsTimePicker && isExperience) {
      // Single-time experiences default to 11:00 AM (opening hour at Casa Club).
      setReservationTime('11:00');
    }
  }, [needsTimePicker, timeslots, reservationTime, isExperience]);

  const productImgRef = useRef(null);
  const triggerFlyToCart = useFlyToCart(productImgRef, null);

  const handleAddToCart = useCallback(async () => {
    if (product && selectedVariant) {
      const availableQuantity = selectedVariant.inventory_quantity;
      // Build line-item metadata only for experiences. Wine bottles keep
      // an empty {} metadata to preserve their merge behavior.
      const metadata = isExperience
        ? { reservation_date: reservationDate, reservation_time: reservationTime || '11:00' }
        : {};
      try {
        triggerFlyToCart();
        await addToCart(product, selectedVariant, quantity, availableQuantity, metadata);
        toast({
          title: t('addedToCart'),
          description: product.title,
          duration: 2500,
          className: "bg-card text-foreground border-none",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('couldNotAdd'),
          description: error.message,
        });
      }
    }
  }, [product, selectedVariant, quantity, addToCart, toast, triggerFlyToCart, t, isExperience, reservationDate, reservationTime]);

  const handleQuantityChange = useCallback((amount) => {
    setQuantity(prevQuantity => {
      const newQuantity = prevQuantity + amount;
      if (newQuantity < 1) return 1;
      return newQuantity;
    });
  }, []);

  const scrollToBuy = useCallback(() => {
    const el = document.getElementById('buy');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchedProduct = await getProduct(productKey);

        try {
          const quantitiesResponse = await getProductQuantities({
            product_ids: [fetchedProduct.id]
          });

          const variantQuantityMap = new Map();
          if (quantitiesResponse && quantitiesResponse.variants) {
            quantitiesResponse.variants.forEach(variant => {
              variantQuantityMap.set(variant.id, variant.inventory_quantity);
            });
          }

          const productWithQuantities = {
            ...fetchedProduct,
            variants: fetchedProduct.variants.map(variant => ({
              ...variant,
              inventory_quantity: variantQuantityMap.get(variant.id) ?? variant.inventory_quantity
            }))
          };

          setProduct(productWithQuantities);

          if (productWithQuantities.variants && productWithQuantities.variants.length > 0) {
            setSelectedVariant(productWithQuantities.variants[0]);
          }
        } catch (quantityError) {
          console.error("Quantity fetch error:", quantityError);
          setProduct(fetchedProduct);
          if (fetchedProduct.variants && fetchedProduct.variants.length > 0) {
            setSelectedVariant(fetchedProduct.variants[0]);
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (productKey) {
      fetchProductData();
    }
  }, [productKey, navigate, i18n.language]);

  const displayTitle = product?.title || '';
  const displaySubtitle = product?.subtitle || '';
  const displayDescription = product?.description || '';
  const metadata = product?.metadata || {};

  // Hero-level derived values (memoized so we don't recompute on every render).
  const hero = useMemo(() => {
    if (!product) return null;
    const { lead, accent } = splitHeroTitle(product.title, metadata, lang);
    const eyebrow = pickLocalized(metadata, 'eyebrow', lang) || product.subtitle || '';
    const leadCopy = pickLocalized(metadata, 'lead', lang) || firstParagraph(product.description);
    const heroImage = product.images?.[0]?.url || product.image || product.thumbnail_url || placeholderImage;
    return { lead, accent, eyebrow, leadCopy, heroImage };
  }, [product, metadata, lang]);

  // Tasting block (only renders if metadata.tasting is an object).
  const tastingEntries = useMemo(() => {
    const t = metadata.tasting;
    if (!t || typeof t !== 'object') return [];
    // Preferred ordering — anything else not in the list comes after, in declared order.
    const preferred = ['aroma', 'flavor', 'finish', 'body', 'palate'];
    const baseKeys = new Set(
      Object.keys(t).map(k => k.replace(/_(es|en)$/, ''))
    );
    const ordered = [
      ...preferred.filter(k => baseKeys.has(k)),
      ...Array.from(baseKeys).filter(k => !preferred.includes(k)),
    ];
    return ordered
      .map(key => {
        const value = pickLocalized(t, key, lang);
        if (!value) return null;
        return { key, value };
      })
      .filter(Boolean);
  }, [metadata, lang]);

  // Specs block — supports `specs: [{label_es, label_en, value_es, value_en}]`
  // or the known-keys shape `{origin, vintage, varietal, abv, volume}`.
  const specsEntries = useMemo(() => {
    const s = metadata.specs;
    if (!s) return [];
    if (Array.isArray(s)) {
      return s
        .map((row) => {
          const label = pickLocalized(row, 'label', lang) || row.label || '';
          const value = pickLocalized(row, 'value', lang) || row.value || '';
          if (!label || !value) return null;
          return { label, value };
        })
        .filter(Boolean);
    }
    if (typeof s === 'object') {
      const knownKeys = [
        'category', 'style', 'varietal', 'origin', 'producer', 'vintage', 'abv',
        'service_temp', 'pairings', 'glass', 'fermentation', 'ingredients',
        'volume', 'format', 'closure', 'sulfites', 'allergens',
        'vegan', 'organic', 'shelf_life',
      ];
      const labels = {
        origin: lang === 'en' ? 'Origin' : 'Origen',
        vintage: lang === 'en' ? 'Vintage' : 'Añada',
        varietal: lang === 'en' ? 'Varietal' : 'Variedad',
        abv: lang === 'en' ? 'Alcohol' : 'Alcohol',
        volume: lang === 'en' ? 'Volume' : 'Formato',
        category: lang === 'en' ? 'Category' : 'Categoría',
        format: lang === 'en' ? 'Format' : 'Formato',
        ingredients: lang === 'en' ? 'Ingredients' : 'Ingredientes',
        shelf_life: lang === 'en' ? 'Shelf life' : 'Vida útil',
        producer: lang === 'en' ? 'Producer' : 'Bodega',
        style: lang === 'en' ? 'Style' : 'Estilo',
        service_temp: lang === 'en' ? 'Serving temperature' : 'Temperatura de servicio',
        pairings: lang === 'en' ? 'Pairings' : 'Maridaje',
        glass: lang === 'en' ? 'Glass' : 'Copa',
        fermentation: lang === 'en' ? 'Fermentation' : 'Fermentación',
        closure: lang === 'en' ? 'Closure' : 'Cierre',
        sulfites: lang === 'en' ? 'Sulfites' : 'Sulfitos',
        allergens: lang === 'en' ? 'Allergens' : 'Alérgenos',
        vegan: lang === 'en' ? 'Vegan' : 'Vegano',
        organic: lang === 'en' ? 'Organic' : 'Orgánico',
      };
      return knownKeys
        .filter(k => s[k] != null && s[k] !== '')
        .map(k => {
          let raw = s[k];
          // Value can be a string OR an object with _es/_en suffix.
          let value = raw;
          if (typeof raw === 'object') {
            value = pickLocalized(raw, '', lang) || raw[`${lang}`] || raw.value || '';
          }
          return { label: labels[k] || k, value: String(value) };
        });
    }
    return [];
  }, [metadata, lang]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main id="main" role="main" className="flex justify-center items-center h-screen bg-background">
          <Loader2 className="h-16 w-16 text-[#D4A574] animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Navigation />
        <main id="main" role="main" className="min-h-screen bg-background pt-32 px-4 flex flex-col items-center justify-center">
          <AlertCircle className="h-16 w-16 text-stone-300 mb-4" />
          <h1 className="text-2xl font-serif text-foreground mb-4">{t('notFound')}</h1>
          <p className="text-foreground/60 mb-8">{error}</p>
          <Link to="/shop">
            <Button className="bg-[#D4A574] hover:bg-[#c29462] text-white">{t('backToShop')}</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const price = selectedVariant?.sale_price_formatted ?? selectedVariant?.price_formatted;
  const originalPrice = selectedVariant?.price_formatted;
  const availableStock = selectedVariant ? selectedVariant.inventory_quantity : 0;
  const isStockManaged = selectedVariant?.manage_inventory ?? false;
  const stockOk = !isStockManaged || quantity <= availableStock;
  // Experiences additionally require a reservation date.
  const reservationOk = !isExperience || !!reservationDate;
  const canAddToCart = stockOk && reservationOk;
  const isSoldOut = isStockManaged && availableStock <= 0;

  const seoImage = product.images?.[0];
  // Allow metadata overrides for SEO-critical fields (title/description/keywords).
  // Used by /product/kibay-wine to target "vino dominicano" without renaming the
  // visible product title. Falls back to derived defaults when absent.
  const seoTitleOverride = pickLocalized(metadata, 'seo_title', lang);
  const seoDescriptionOverride = pickLocalized(metadata, 'seo_description', lang);
  const seoKeywords = pickLocalized(metadata, 'seo_keywords', lang);
  const seoTitle = seoTitleOverride || `${displayTitle} | Kibay`;
  const seoDescription = seoDescriptionOverride
    || displaySubtitle
    || displayDescription.replace(/<[^>]+>/g, '').slice(0, 160);
  const newsletterTags = product.slug === 'kibay-sparkling' ? ['Sparkling Can Interest'] : [];
  const productUrl = `${window.location.origin}/product/${product.slug || product.id}`;

  const tastingLabelKey = {
    aroma: 'tasting.aroma',
    flavor: 'tasting.flavor',
    palate: 'tasting.flavor',
    finish: 'tasting.finish',
    body: 'tasting.body',
  };

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={seoImage?.url}
        url={productUrl}
        type="product"
        canonicalUrl={productUrl}
        keywords={seoKeywords}
      />

      <SchemaMarkup
        type="Product"
        data={{
          name: seoTitle,
          image: seoImage?.url || placeholderImage,
          description: seoDescription,
          sku: selectedVariant?.sku || product.id,
          url: productUrl,
          price: (selectedVariant?.price_in_cents ?? 0) / 100,
          currency: selectedVariant?.currency?.toUpperCase() || 'USD',
          inStock: !isSoldOut,
          aggregateRating:
            reviewAggregate?.count > 0
              ? {
                  ratingValue: reviewAggregate.avg.toFixed(1),
                  reviewCount: reviewAggregate.count,
                }
              : undefined,
        }}
      />

      <SchemaMarkup
        type="BreadcrumbList"
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: displayTitle, url: `/product/${product.slug || product.id}` },
          ],
        }}
      />

      {product.additional_info?.length > 0 && (
        <SchemaMarkup
          type="FAQPage"
          data={{
            questions: product.additional_info
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((info) => ({
                question: info.title,
                answer: info.description,
              })),
          }}
        />
      )}

      <Navigation />

      <main id="main" role="main" className="bg-background min-h-screen">
        {/* ---------------------------------------------------------------- */}
        {/* Hero — editorial, brand-rich                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative pt-32 pb-16 lg:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/shop" className="inline-flex items-center gap-2 text-foreground/60 hover:text-[#D4A574] transition-colors mb-10 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              {t('backToShop')}
            </Link>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-7"
              >
                {hero?.eyebrow && (
                  <span className="inline-block text-[#D4A574] font-medium tracking-widest uppercase text-sm">
                    {hero.eyebrow}
                  </span>
                )}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light font-serif text-foreground leading-[1.05]">
                  {hero?.accent ? (
                    <>
                      {hero.lead} <br />
                      <span className="text-[#D4A574]">{hero.accent}</span>
                    </>
                  ) : (
                    hero?.lead
                  )}
                </h1>

                {displaySubtitle && (
                  <h2 className="text-xl md:text-2xl text-foreground/70 font-light leading-relaxed">
                    {displaySubtitle}
                  </h2>
                )}

                {hero?.leadCopy && (
                  <p className="text-lg text-foreground/70 max-w-xl font-light leading-relaxed">
                    {hero.leadCopy}
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    onClick={scrollToBuy}
                    className="bg-[#D4A574] hover:bg-[#c29462] text-white px-8 py-7 text-lg rounded-full font-normal shadow-[0_0_24px_rgba(212,165,116,0.3)] transition-all hover:scale-105"
                  >
                    {t('hero.cta')} <ArrowDown className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </m.div>

              <m.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative flex justify-center lg:justify-end -mx-4 sm:mx-0"
              >
                <div className="relative w-full sm:w-auto">
                  <div className="absolute inset-0 bg-[#D4A574]/30 rounded-full blur-[110px] opacity-60 hidden sm:block" aria-hidden="true" />
                  <img
                    src={hero?.heroImage}
                    alt={displayTitle}
                    className="relative z-10 w-full h-auto block sm:w-auto sm:max-h-[560px] sm:object-contain sm:drop-shadow-2xl sm:rounded-lg"
                    loading="eager"
                    decoding="async"
                    fetchpriority="high"
                  />
                </div>
              </m.div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Tasting Notes — only if metadata.tasting exists                  */}
        {/* ---------------------------------------------------------------- */}
        {tastingEntries.length > 0 && (
          <section className="py-20 bg-card border-t border-foreground/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-14"
              >
                <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                  {t('tasting.heading')}
                </h2>
                <div className="w-16 h-px bg-[#D4A574] mx-auto" />
              </m.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {tastingEntries.map((entry, i) => {
                  const Icon = TASTING_ICONS[i % TASTING_ICONS.length];
                  const labelKey = tastingLabelKey[entry.key];
                  const label = labelKey
                    ? t(labelKey)
                    : entry.key.charAt(0).toUpperCase() + entry.key.slice(1);
                  return (
                    <m.div
                      key={entry.key}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-background p-8 rounded-2xl border border-stone-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center mb-5">
                        <Icon className="w-5 h-5 text-[#D4A574]" />
                      </div>
                      <span className="block text-xs uppercase text-foreground/60 tracking-widest mb-2">
                        {label}
                      </span>
                      <p className="text-foreground/90 font-medium leading-relaxed">
                        {entry.value}
                      </p>
                    </m.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Specs panel — only if metadata.specs exists                      */}
        {/* ---------------------------------------------------------------- */}
        {specsEntries.length > 0 && (
          <section className="py-20 bg-background border-t border-stone-100">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-10 text-center">
                {t('specs.heading')}
              </h2>
              <div className="grid gap-1">
                {specsEntries.map((row, idx) => (
                  <m.div
                    key={`${row.label}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex justify-between items-center gap-6 py-4 border-b border-stone-200 last:border-0"
                  >
                    <span className="text-foreground/60 font-light uppercase tracking-wide text-xs sm:text-sm">
                      {row.label}
                    </span>
                    <span className="text-foreground font-medium text-right text-sm sm:text-base">
                      {row.value}
                    </span>
                  </m.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Commerce — gallery + buy box                                     */}
        {/* ---------------------------------------------------------------- */}
        <section id="buy" className="py-20 bg-card border-t border-foreground/10 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
              <m.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex justify-center lg:justify-start"
              >
                <ProductImageGallery
                  images={product.images}
                  title={displayTitle}
                  ribbonText={product.ribbon_text}
                  ref={productImgRef}
                />
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex flex-col pt-4"
              >
                <h3 className="text-3xl md:text-4xl font-serif text-foreground mb-3 leading-tight font-light">
                  {displayTitle}
                </h3>
                {displaySubtitle && (
                  <p className="text-lg text-foreground/60 font-light mb-8 leading-relaxed">
                    {displaySubtitle}
                  </p>
                )}

                <div className="flex items-baseline gap-4 mb-8 pb-8 border-b border-stone-100">
                  <span className="text-3xl font-light text-[#D4A574]">{price}</span>
                  {selectedVariant?.sale_price_in_cents && (
                    <span className="text-xl text-foreground/50 line-through decoration-stone-300">{originalPrice}</span>
                  )}
                </div>

                {product.variants.length > 1 && (
                  <div className="mb-8">
                    <h4 className="text-xs font-medium uppercase tracking-widest text-foreground/60 mb-4">{t('selectVariant')}</h4>
                    <div className="flex flex-wrap gap-3">
                      {product.variants.map(variant => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-6 py-3 rounded-full border transition-all duration-300 text-sm font-medium ${
                            selectedVariant?.id === variant.id
                              ? 'bg-card text-foreground border-border shadow-md'
                              : 'bg-white text-foreground/70 border-stone-200 hover:border-[#D4A574] hover:text-[#D4A574]'
                          }`}
                        >
                          {variant.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------ */}
                {/* Reservation block — only for experience-type products  */}
                {/* ------------------------------------------------------ */}
                {isExperience && (
                  <div className="mb-8 p-6 rounded-2xl bg-background border border-stone-200">
                    <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-foreground/90 mb-4">
                      <Calendar size={16} className="text-[#D4A574]" />
                      {t('reservation.heading')}
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="reservation-date"
                          className="block text-xs font-medium uppercase tracking-wide text-foreground/60"
                        >
                          {t('reservation.dateLabel')} *
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              id="reservation-date"
                              type="button"
                              className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-left text-foreground hover:border-[#D4A574] focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574] flex items-center justify-between transition-colors"
                            >
                              <span className={reservationDate ? 'text-foreground' : 'text-foreground/50'}>
                                {reservationDate
                                  ? new Date(reservationDate + 'T00:00:00').toLocaleDateString(
                                      i18n.language === 'en' ? 'en-US' : 'es-DO',
                                      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
                                    )
                                  : t('reservation.dateLabel')}
                              </span>
                              <Calendar size={16} className="text-[#D4A574] flex-shrink-0 ml-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={reservationDate ? new Date(reservationDate + 'T00:00:00') : undefined}
                              onSelect={(d) => {
                                if (!d) {
                                  setReservationDate('');
                                  return;
                                }
                                // Format YYYY-MM-DD in local time (no timezone shift)
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                setReservationDate(`${y}-${m}-${day}`);
                              }}
                              disabled={(d) => {
                                // Block past + lead-time minimum
                                const min = new Date(minReservationDate + 'T00:00:00');
                                if (d < min) return true;
                                // Saturdays (6) and Sundays (0) only — Ocoa Bay opens weekends + holidays.
                                // Holidays would need a holiday calendar; for now Sat/Sun only.
                                const day = d.getDay();
                                return day !== 0 && day !== 6;
                              }}
                              initialFocus
                              showOutsideDays={false}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {needsTimePicker && (
                        <div className="space-y-2">
                          <label
                            htmlFor="reservation-time"
                            className="block text-xs font-medium uppercase tracking-wide text-foreground/60"
                          >
                            {t('reservation.timeLabel')} *
                          </label>
                          <select
                            id="reservation-time"
                            name="reservationTime"
                            value={reservationTime}
                            onChange={(e) => setReservationTime(e.target.value)}
                            required
                            className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-foreground focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
                          >
                            {timeslots.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-4 italic">
                      {t('reservation.availability')}
                    </p>
                    {!reservationDate && (
                      <p className="text-xs text-[#D4A574] mt-2">
                        {t('reservation.required')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 mb-8 sm:items-end">
                  <div className="flex flex-col gap-2">
                    {isExperience && (
                      <label
                        htmlFor="adults-stepper"
                        className="block text-xs font-medium uppercase tracking-wide text-foreground/60"
                      >
                        {t('adultsLabel')}
                      </label>
                    )}
                    <div
                      id={isExperience ? 'adults-stepper' : undefined}
                      className="flex items-center bg-background border border-foreground/15 rounded-full p-1 w-fit shadow-sm"
                    >
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1 || isSoldOut}
                        aria-label={t('decrease')}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 text-foreground/70 transition-colors disabled:opacity-50"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center text-lg font-medium text-foreground">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={isSoldOut}
                        aria-label={t('increase')}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 text-foreground/70 transition-colors disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    disabled={!canAddToCart || isSoldOut || !product.purchasable}
                    className="flex-1 bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full py-7 text-lg shadow-lg shadow-[#D4A574]/20 transition-all duration-300 disabled:bg-stone-200 disabled:text-stone-950/50 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    {isSoldOut ? t('outOfStock') : t('addToCart')}
                  </Button>
                </div>

                {isStockManaged && product.purchasable && !isSoldOut && (
                  <div className="mb-8">
                    {canAddToCart ? (
                      <p className="text-sm text-foreground/60 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" /> {t('inStock')}
                        {availableStock < 10 && <span className="text-[#D4A574]">({availableStock})</span>}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500 flex items-center gap-2">
                        <AlertCircle size={14} /> {t('lowStock')} ({availableStock})
                      </p>
                    )}
                  </div>
                )}

                {/* Softer, smaller description treatment now that hero carries the lead */}
                <div className="prose prose-stone prose-base max-w-none text-foreground/60 leading-relaxed font-light mb-10">
                  <div dangerouslySetInnerHTML={{ __html: displayDescription }} />
                </div>

                {product.additional_info?.length > 0 && (
                  <div className="space-y-6 border-t border-stone-100 pt-8">
                    {product.additional_info
                      .sort((a, b) => a.order - b.order)
                      .map((info) => (
                        <div key={info.id}>
                          <h4 className="text-lg font-serif text-foreground mb-2">{info.title}</h4>
                          <div className="text-foreground/60 leading-relaxed font-light" dangerouslySetInnerHTML={{ __html: info.description || '' }} />
                        </div>
                      ))}
                  </div>
                )}
              </m.div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Reviews / Related / Newsletter — preserved from original         */}
        {/* ---------------------------------------------------------------- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="mb-20">
            <ProductReviews
              productId={product.id}
              onAggregateChange={setReviewAggregate}
            />
          </div>

          <RelatedProducts excludeId={product.id} />

          <div className="mt-20 bg-card border border-foreground/10 rounded-3xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <NewsletterSignup
                headline={i18n.t('shop:newsletterHeadline')}
                fields={{ firstName: true, email: true }}
                buttonText={i18n.t('shop:newsletterButton')}
                source="Product Page Interest"
                tags={newsletterTags}
              />
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Cinco formas de disfrutar Kibay — condensed version of the       */}
        {/* homepage section. Mobile = horizontal snap-scroll, desktop = 5-col grid. */}
        {/* ---------------------------------------------------------------- */}
        <EnjoyKibaySection />
      </main>

      <Footer />
    </>
  );
}

// ---------------------------------------------------------------------------
// Cinco formas de disfrutar Kibay — compact version reused on every PDP.
// Mobile: horizontal snap-scroll. Desktop: 5-column grid.
// Copy + photos come from `product:enjoy` (shorter than the homepage variant).
// ---------------------------------------------------------------------------
function EnjoyKibaySection() {
  const { t } = useTranslation('product');
  const ways = t('enjoy.ways', { returnObjects: true });
  if (!Array.isArray(ways) || ways.length === 0) return null;

  return (
    <section className="relative bg-gradient-to-b from-card to-background border-t border-foreground/10 py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div>
            <span className="block text-xs uppercase tracking-[0.25em] text-[#D4A574] font-medium mb-3">
              {t('enjoy.eyebrow')}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-foreground leading-tight max-w-2xl">
              {t('enjoy.heading')}
            </h2>
            <p className="text-foreground/60 mt-4 max-w-xl font-light">
              {t('enjoy.subheading')}
            </p>
          </div>
          <Link
            to="/vine-and-barrel"
            className="inline-flex items-center gap-2 text-[#D4A574] hover:text-[#c29462] font-medium whitespace-nowrap group"
          >
            {t('enjoy.cta')}
            <ArrowDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Mobile: horizontal snap scroll. Desktop: 5-col grid. */}
        <div className="flex lg:grid lg:grid-cols-5 gap-5 overflow-x-auto snap-x snap-mandatory lg:overflow-visible pb-4 lg:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 scrollbar-hide">
          {ways.map((way, i) => (
            <m.article
              key={way.slug || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: (i % 5) * 0.06 }}
              className="snap-start shrink-0 w-[78vw] max-w-[300px] sm:w-[42vw] lg:w-auto lg:max-w-none group"
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-4 shadow-lg">
                <img
                  src={way.image}
                  alt={way.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 bg-[#D4A574] text-white text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full">
                  {way.kicker}
                </span>
              </div>
              <h3 className="text-lg font-serif text-foreground leading-snug mb-2">
                {way.title}
              </h3>
              <p className="text-sm text-foreground/60 font-light leading-relaxed">
                {way.lead}
              </p>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductDetailPage;
