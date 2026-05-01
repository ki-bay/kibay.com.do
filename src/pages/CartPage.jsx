import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Cart from '@/components/Cart';

const CartPage = () => {
  const { t } = useTranslation('cart');
  return (
    <>
      <Helmet>
        <title>{t('title')} — Kibay</title>
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background pt-28 pb-20">
        <Cart />
      </div>
      
      <Footer />
    </>
  );
};

export default CartPage;