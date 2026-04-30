import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductsList from '@/components/ProductsList';
import NewsletterSignup from '@/components/NewsletterSignup';
import SEOHead from '@/components/SEOHead';
import { mediaUrl } from '@/config/mediaCdn';

const ShopPage = () => {
  const { t } = useTranslation('shop');

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
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
                <Trans
                  i18nKey="shop:header.title"
                  components={{ accent: <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal" /> }}
                />
              </h1>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                {t('header.subtitle')}
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
           <div className="max-w-4xl mx-auto text-foreground">
              <NewsletterSignup
                headline={t('newsletterHeadline')}
                fields={{ firstName: true, email: true }}
                buttonText={t('newsletterButton')}
                source="Shop Page Interest"
              />
           </div>
        </section>

        {/* Brand Promise Banner */}
        <section className="bg-background py-24 px-4 border-t border-foreground/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-500/5 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="flex items-center justify-center mx-auto mb-8">
              <img
                src={mediaUrl('8557ed8a8cfde6155f713b177c6452a7.png')}
                alt=""
                className="w-16 h-16 object-contain"
              />
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">{t('promise.heading')}</h2>
            <p className="text-foreground/70 leading-relaxed mb-8 text-lg font-light">
              {t('promise.body')}
            </p>
            <Link to="/about">
              <span className="inline-block border-b border-orange-500 text-foreground font-medium hover:text-orange-500 hover:border-orange-400 transition-colors cursor-pointer pb-1">
                {t('promise.cta')}
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
