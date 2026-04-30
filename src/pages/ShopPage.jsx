import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductsList from '@/components/ProductsList';
import NewsletterSignup from '@/components/NewsletterSignup';
import SEOHead from '@/components/SEOHead';
import { mediaUrl } from '@/config/mediaCdn';

const ShopPage = () => {
  return (
    <>
      <SEOHead 
        title="Shop Kibay Wines & Espumante | Caribbean Wine Store"
        description="Browse our collection of Kibay Espumante and Caribbean wines. Organic, modern, and crafted in the Dominican Republic."
      />
      
      <Navigation />
      
      <div className="min-h-screen bg-background pt-20">
        {/* Shop Header */}
        <section className="bg-gradient-to-b from-background to-card py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
                The <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Collection</span>
              </h1>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                Discover the vibrant taste of the Dominican Republic. Sustainably crafted, naturally fermented, and delivered directly to your door.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Product Grid - No limits, shows all from component */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <ProductsList />
        </section>

        {/* Newsletter Section */}
        <section className="bg-card py-20 px-4 border-t border-foreground/5">
           <div className="max-w-4xl mx-auto text-foreground"> {/* Added text-foreground here */}
              <NewsletterSignup 
                headline="Not ready to order? Get tasting notes, cocktail ideas, and launch news by email."
                fields={{ firstName: true, email: true }}
                buttonText="Send me updates"
                source="Shop Page Interest"
              />
           </div>
        </section>

        {/* Brand Promise Banner */}
        <section className="bg-background py-24 px-4 border-t border-foreground/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Replaced icon container with direct image */}
            <div className="flex items-center justify-center mx-auto mb-8">
              <img 
                src={mediaUrl('8557ed8a8cfde6155f713b177c6452a7.png')} 
                alt="Mango and Passion Fruit" 
                className="w-16 h-16 object-contain" 
              />
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">Crafted by Nature, Perfected by Passion</h2>
            <p className="text-foreground/70 leading-relaxed mb-8 text-lg font-light">
              Every sip of Kibay connects you to the lush vineyards of Ocoa Bay. We believe in sustainable practices, organic ingredients, and the pure joy of Caribbean flavors.
            </p>
            <Link to="/about">
              <span className="inline-block border-b border-orange-500 text-foreground font-medium hover:text-orange-500 hover:border-orange-400 transition-colors cursor-pointer pb-1">
                Read our full story
              </span>
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default ShopPage;