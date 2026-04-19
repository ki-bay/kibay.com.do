import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProduct, getProductQuantities } from '@/api/EcommerceApi';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Loader2, ArrowLeft, CheckCircle, Minus, Plus, AlertCircle, ShoppingBag } from 'lucide-react';
import NewsletterSignup from '@/components/NewsletterSignup';
import SEOHead from '@/components/SEOHead';
import SchemaMarkup from '@/components/SchemaMarkup';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import ProductImageGallery from '@/components/ProductImageGallery';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2E4YTJhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const productImgRef = useRef(null);
  const triggerFlyToCart = useFlyToCart(productImgRef, null);

  const handleAddToCart = useCallback(async () => {
    if (product && selectedVariant) {
      const availableQuantity = selectedVariant.inventory_quantity;
      try {
        triggerFlyToCart();
        await addToCart(product, selectedVariant, quantity, availableQuantity);
        toast({
          title: "Added to Cart",
          description: `${product.title.replace(/Espumante/gi, 'Sparkling')} has been added.`,
          className: "bg-stone-900 text-white border-none",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Could not add item",
          description: error.message,
        });
      }
    }
  }, [product, selectedVariant, quantity, addToCart, toast, triggerFlyToCart]);

  const handleQuantityChange = useCallback((amount) => {
    setQuantity(prevQuantity => {
        const newQuantity = prevQuantity + amount;
        if (newQuantity < 1) return 1;
        return newQuantity;
    });
  }, []);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch product details by ID
        const fetchedProduct = await getProduct(id);

        try {
          // Fetch real-time quantities
          const quantitiesResponse = await getProductQuantities({
            fields: 'inventory_quantity',
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

          // Select first variant by default
          if (productWithQuantities.variants && productWithQuantities.variants.length > 0) {
            setSelectedVariant(productWithQuantities.variants[0]);
          }
        } catch (quantityError) {
          console.error("Quantity fetch error:", quantityError);
          // Still set product without quantities if that sub-fetch fails
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

    if (id) {
      fetchProductData();
    }
  }, [id, navigate]);

  const displayTitle = useMemo(() => product?.title ? product.title.replace(/Espumante/gi, 'Sparkling') : '', [product]);
  const displaySubtitle = useMemo(() => product?.subtitle ? product.subtitle.replace(/Espumante/gi, 'Sparkling') : '', [product]);
  
  // Correction logic for alcohol content in description specifically for Sparkling product
  const displayDescription = useMemo(() => {
    if (!product?.description) return '';
    let desc = product.description.replace(/Espumante/gi, 'Sparkling');
    if (product.id === 'prod_01KGN2VJG7VK77WSXB2V5YRBMW') {
       desc = desc.replace(/11%/g, '6%').replace(/11 %/g, '6 %');
    }
    return desc;
  }, [product]);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex justify-center items-center h-screen bg-stone-50">
          <Loader2 className="h-16 w-16 text-[#D4A574] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-stone-50 pt-32 px-4 flex flex-col items-center justify-center">
          <AlertCircle className="h-16 w-16 text-stone-300 mb-4" />
          <h1 className="text-2xl font-serif text-stone-900 mb-4">Product Not Found</h1>
          <p className="text-stone-500 mb-8">{error || "We couldn't find the product you're looking for."}</p>
          <Link to="/shop">
            <Button className="bg-[#D4A574] hover:bg-[#c29462] text-white">Return to Shop</Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  const price = selectedVariant?.sale_price_formatted ?? selectedVariant?.price_formatted;
  const originalPrice = selectedVariant?.price_formatted;
  const availableStock = selectedVariant ? selectedVariant.inventory_quantity : 0;
  const isStockManaged = selectedVariant?.manage_inventory ?? false;
  const canAddToCart = !isStockManaged || quantity <= availableStock;
  const isSoldOut = isStockManaged && availableStock <= 0;

  // SEO Image - Use the first image
  const seoImage = product.images?.[0];

  // Check if product is Kibay Sparkling
  const isSparkling = displayTitle.toLowerCase().includes('sparkling') || displayTitle.toLowerCase().includes('kibay');
  const newsletterTags = isSparkling ? ['Sparkling Can Interest'] : [];

  // SEO Logic
  // Default values
  let seoTitle = `${displayTitle} | Kibay Wine Shop`;
  let seoDescription = displaySubtitle || displayDescription.substring(0, 160);
  
  // Custom SEO Overrides for specific products
  if (id === 'prod_01KGN2VJG7VK77WSXB2V5YRBMW') {
    seoTitle = "Kibay Sparkling - Organic Mango & Passion Fruit Wine | Dominican Republic";
    seoDescription = "Discover Kibay Sparkling, an organic sparkling wine with mango & passion fruit, naturally fermented in the Dominican Republic. Fresh, modern, and unmistakably Caribbean.";
  } else if (id === 'prod_01KGN391RB74JH2YHXACF0XTT7') {
    seoTitle = "Kibay Wine - Still Wine from Dominican Republic | Organic Terroir";
    seoDescription = "Experience Kibay Wine, the original still wine capturing the essence of tropical terroir with balance and character. Organically crafted in the Dominican Republic.";
  }

  const productUrl = `${window.location.origin}/product/${id}`;
  
  return (
    <>
      <SEOHead
        title={seoTitle} // Title already includes pipe and suffix
        description={seoDescription}
        image={seoImage?.url}
        url={productUrl}
        type="product"
        canonicalUrl={productUrl}
      />
      
      <SchemaMarkup
        type="Product"
        data={{
          name: seoTitle,
          image: seoImage?.url || placeholderImage,
          description: seoDescription,
          sku: selectedVariant?.sku || id,
          url: productUrl,
          price: selectedVariant?.price / 100, // Assuming price is in cents based on previous context
          currency: 'USD', // Default currency
          inStock: !isSoldOut
        }}
      />
      
      <Navigation />
      
      <div className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Link to="/shop" className="inline-flex items-center gap-2 text-stone-500 hover:text-[#D4A574] transition-colors mb-8 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Collection
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 mb-20">
            {/* Image Gallery */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center lg:justify-start"
            >
              <ProductImageGallery 
                images={product.images}
                title={displayTitle}
                ribbonText={product.ribbon_text}
                ref={productImgRef}
              />
            </motion.div>

            {/* Product Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col pt-4"
            >
              <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4 leading-tight">{displayTitle}</h1>
              <p className="text-xl text-stone-500 font-light mb-8 leading-relaxed">{displaySubtitle}</p>

              <div className="flex items-baseline gap-4 mb-8 pb-8 border-b border-stone-100">
                <span className="text-3xl font-medium text-[#D4A574]">{price}</span>
                {selectedVariant?.sale_price_in_cents && (
                  <span className="text-xl text-stone-400 line-through decoration-stone-300">{originalPrice}</span>
                )}
              </div>

              {/* Variants */}
              {product.variants.length > 1 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 mb-4">Select Option</h3>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-6 py-3 rounded-full border transition-all duration-300 text-sm font-medium ${
                          selectedVariant?.id === variant.id 
                            ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-[#D4A574] hover:text-[#D4A574]'
                        }`}
                      >
                        {variant.title.replace(/Espumante/gi, 'Sparkling')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex items-center bg-white border border-stone-200 rounded-full p-1 w-fit shadow-sm">
                  <button 
                    onClick={() => handleQuantityChange(-1)} 
                    disabled={quantity <= 1 || isSoldOut}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600 transition-colors disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-lg font-medium text-stone-900">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(1)} 
                    disabled={isSoldOut}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600 transition-colors disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <Button 
                  onClick={handleAddToCart} 
                  disabled={!canAddToCart || isSoldOut || !product.purchasable}
                  className="flex-1 bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full py-7 text-lg shadow-lg shadow-[#D4A574]/20 transition-all duration-300 disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {isSoldOut ? 'Out of Stock' : (!product.purchasable ? 'Unavailable' : 'Add to Cart')}
                </Button>
              </div>
              
              {/* Stock Warning */}
              {isStockManaged && product.purchasable && !isSoldOut && (
                 <div className="mb-8">
                   {canAddToCart ? (
                     <p className="text-sm text-stone-500 flex items-center gap-2">
                       <CheckCircle size={14} className="text-green-500" /> In Stock
                       {availableStock < 10 && <span className="text-[#D4A574]">({availableStock} left)</span>}
                     </p>
                   ) : (
                     <p className="text-sm text-red-500 flex items-center gap-2">
                       <AlertCircle size={14} /> Only {availableStock} left in stock
                     </p>
                   )}
                 </div>
              )}

              {/* Description */}
              <div className="prose prose-stone prose-lg max-w-none text-stone-600 leading-relaxed font-light mb-12">
                <div dangerouslySetInnerHTML={{ __html: displayDescription }} />
              </div>

              {/* Additional Info Accordion style or list */}
              {product.additional_info?.length > 0 && (
                <div className="space-y-6 border-t border-stone-100 pt-8">
                  {product.additional_info
                    .sort((a, b) => a.order - b.order)
                    .map((info) => (
                      <div key={info.id}>
                        <h3 className="text-lg font-serif text-stone-900 mb-2">{info.title}</h3>
                        <div className="text-stone-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: info.description.replace(/Espumante/gi, 'Sparkling') }} />
                      </div>
                    ))}
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Newsletter Signup Mid-Page */}
          <div className="mb-20 bg-stone-100 rounded-3xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
               <NewsletterSignup 
                 headline="Not ready to order? Get tasting notes, cocktail ideas, and launch news by email."
                 fields={{ firstName: true, email: true }}
                 buttonText="Send me updates"
                 source="Product Page Interest"
                 tags={newsletterTags}
               />
            </div>
          </div>
          
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ProductDetailPage;