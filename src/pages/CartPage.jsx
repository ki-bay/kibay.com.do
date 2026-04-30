import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Cart from '@/components/Cart';

const CartPage = () => {
  return (
    <>
      <Helmet>
        <title>Shopping Cart - Kibay Espumante</title>
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