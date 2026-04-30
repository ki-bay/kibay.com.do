import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esFooter from './locales/es/footer.json';
import esHome from './locales/es/home.json';
import esShop from './locales/es/shop.json';
import esProduct from './locales/es/product.json';
import esCart from './locales/es/cart.json';
import esCheckout from './locales/es/checkout.json';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enFooter from './locales/en/footer.json';
import enHome from './locales/en/home.json';
import enShop from './locales/en/shop.json';
import enProduct from './locales/en/product.json';
import enCart from './locales/en/cart.json';
import enCheckout from './locales/en/checkout.json';

const resources = {
  es: {
    common: esCommon,
    nav: esNav,
    footer: esFooter,
    home: esHome,
    shop: esShop,
    product: esProduct,
    cart: esCart,
    checkout: esCheckout,
  },
  en: {
    common: enCommon,
    nav: enNav,
    footer: enFooter,
    home: enHome,
    shop: enShop,
    product: enProduct,
    cart: enCart,
    checkout: enCheckout,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',
    ns: ['common', 'nav', 'footer', 'home', 'shop', 'product', 'cart', 'checkout'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kibay_lang',
    },
  });

export default i18n;
