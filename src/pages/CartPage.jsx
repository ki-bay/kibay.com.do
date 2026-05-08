import React from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Cart from '@/components/Cart';
import SEOHead from '@/components/SEOHead';

const CartPage = () => {
  const { t } = useTranslation('cart');
  return (
    <>
      <SEOHead
        title={`${t('title')} — Kibay`}
        noindex
      />

      <Navigation />
      
      <main id="main" role="main" className="min-h-screen bg-background pt-28 pb-20">
        <Cart />
      </main>
      
      <Footer />
    </>
  );
};

export default CartPage;