import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// --- Spanish (default) ----------------------------------------------------
import esCommon from './locales/es/common.json';
import esNav from './locales/es/nav.json';
import esFooter from './locales/es/footer.json';
import esHome from './locales/es/home.json';
import esShop from './locales/es/shop.json';
import esProduct from './locales/es/product.json';
import esCart from './locales/es/cart.json';
import esCheckout from './locales/es/checkout.json';
import esAbout from './locales/es/about.json';

// Auth + info
import esLogin from './locales/es/login.json';
import esRegister from './locales/es/register.json';
import esVerifyOtp from './locales/es/verifyOtp.json';
import esBlogLogin from './locales/es/blogLogin.json';
import esContact from './locales/es/contact.json';
import esNotFound from './locales/es/notFound.json';
import esDiagnostic from './locales/es/diagnostic.json';
import esWhitepaper from './locales/es/whitepaper.json';
import esProfile from './locales/es/profile.json';

// Legal + product landings
import esTerms from './locales/es/terms.json';
import esPrivacy from './locales/es/privacy.json';
import esShippingReturns from './locales/es/shippingReturns.json';
import esProductSparklingBottle from './locales/es/productSparklingBottle.json';
import esProductSparklingCan from './locales/es/productSparklingCan.json';
import esProductSparklingMain from './locales/es/productSparklingMain.json';
import esProductWine from './locales/es/productWine.json';

// Ingredient + experience
import esMango from './locales/es/mango.json';
import esPassionFruit from './locales/es/passionFruit.json';
import esWhyCans from './locales/es/whyCans.json';
import esVineAndBarrel from './locales/es/vineAndBarrel.json';

// Ecommerce admin
import esAdminOrders from './locales/es/adminOrders.json';
import esAdminProducts from './locales/es/adminProducts.json';
import esAdminProductForm from './locales/es/adminProductForm.json';
import esAdminCustomers from './locales/es/adminCustomers.json';
import esAdminCoupons from './locales/es/adminCoupons.json';
import esAdminAnalytics from './locales/es/adminAnalytics.json';
import esAdminShipping from './locales/es/adminShipping.json';

// Ops + email admin
import esAdminApiKeys from './locales/es/adminApiKeys.json';
import esAdminLogs from './locales/es/adminLogs.json';
import esAdminNewsletter from './locales/es/adminNewsletter.json';
import esAdminSocialDashboard from './locales/es/adminSocialDashboard.json';
import esAdminSocialSettings from './locales/es/adminSocialSettings.json';
import esAdminBlog from './locales/es/adminBlog.json';
import esAdminBlogForm from './locales/es/adminBlogForm.json';
import esAdminEmailDashboard from './locales/es/adminEmailDashboard.json';
import esAdminEmailContacts from './locales/es/adminEmailContacts.json';
import esAdminEmailCampaigns from './locales/es/adminEmailCampaigns.json';
import esAdminEmailComposer from './locales/es/adminEmailComposer.json';

// --- English --------------------------------------------------------------
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enFooter from './locales/en/footer.json';
import enHome from './locales/en/home.json';
import enShop from './locales/en/shop.json';
import enProduct from './locales/en/product.json';
import enCart from './locales/en/cart.json';
import enCheckout from './locales/en/checkout.json';
import enAbout from './locales/en/about.json';

import enLogin from './locales/en/login.json';
import enRegister from './locales/en/register.json';
import enVerifyOtp from './locales/en/verifyOtp.json';
import enBlogLogin from './locales/en/blogLogin.json';
import enContact from './locales/en/contact.json';
import enNotFound from './locales/en/notFound.json';
import enDiagnostic from './locales/en/diagnostic.json';
import enWhitepaper from './locales/en/whitepaper.json';
import enProfile from './locales/en/profile.json';

import enTerms from './locales/en/terms.json';
import enPrivacy from './locales/en/privacy.json';
import enShippingReturns from './locales/en/shippingReturns.json';
import enProductSparklingBottle from './locales/en/productSparklingBottle.json';
import enProductSparklingCan from './locales/en/productSparklingCan.json';
import enProductSparklingMain from './locales/en/productSparklingMain.json';
import enProductWine from './locales/en/productWine.json';

import enMango from './locales/en/mango.json';
import enPassionFruit from './locales/en/passionFruit.json';
import enWhyCans from './locales/en/whyCans.json';
import enVineAndBarrel from './locales/en/vineAndBarrel.json';

import enAdminOrders from './locales/en/adminOrders.json';
import enAdminProducts from './locales/en/adminProducts.json';
import enAdminProductForm from './locales/en/adminProductForm.json';
import enAdminCustomers from './locales/en/adminCustomers.json';
import enAdminCoupons from './locales/en/adminCoupons.json';
import enAdminAnalytics from './locales/en/adminAnalytics.json';
import enAdminShipping from './locales/en/adminShipping.json';

import enAdminApiKeys from './locales/en/adminApiKeys.json';
import enAdminLogs from './locales/en/adminLogs.json';
import enAdminNewsletter from './locales/en/adminNewsletter.json';
import enAdminSocialDashboard from './locales/en/adminSocialDashboard.json';
import enAdminSocialSettings from './locales/en/adminSocialSettings.json';
import enAdminBlog from './locales/en/adminBlog.json';
import enAdminBlogForm from './locales/en/adminBlogForm.json';
import enAdminEmailDashboard from './locales/en/adminEmailDashboard.json';
import enAdminEmailContacts from './locales/en/adminEmailContacts.json';
import enAdminEmailCampaigns from './locales/en/adminEmailCampaigns.json';
import enAdminEmailComposer from './locales/en/adminEmailComposer.json';

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
    about: esAbout,
    login: esLogin,
    register: esRegister,
    verifyOtp: esVerifyOtp,
    blogLogin: esBlogLogin,
    contact: esContact,
    notFound: esNotFound,
    diagnostic: esDiagnostic,
    whitepaper: esWhitepaper,
    profile: esProfile,
    terms: esTerms,
    privacy: esPrivacy,
    shippingReturns: esShippingReturns,
    productSparklingBottle: esProductSparklingBottle,
    productSparklingCan: esProductSparklingCan,
    productSparklingMain: esProductSparklingMain,
    productWine: esProductWine,
    mango: esMango,
    passionFruit: esPassionFruit,
    whyCans: esWhyCans,
    vineAndBarrel: esVineAndBarrel,
    adminOrders: esAdminOrders,
    adminProducts: esAdminProducts,
    adminProductForm: esAdminProductForm,
    adminCustomers: esAdminCustomers,
    adminCoupons: esAdminCoupons,
    adminAnalytics: esAdminAnalytics,
    adminShipping: esAdminShipping,
    adminApiKeys: esAdminApiKeys,
    adminLogs: esAdminLogs,
    adminNewsletter: esAdminNewsletter,
    adminSocialDashboard: esAdminSocialDashboard,
    adminSocialSettings: esAdminSocialSettings,
    adminBlog: esAdminBlog,
    adminBlogForm: esAdminBlogForm,
    adminEmailDashboard: esAdminEmailDashboard,
    adminEmailContacts: esAdminEmailContacts,
    adminEmailCampaigns: esAdminEmailCampaigns,
    adminEmailComposer: esAdminEmailComposer,
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
    about: enAbout,
    login: enLogin,
    register: enRegister,
    verifyOtp: enVerifyOtp,
    blogLogin: enBlogLogin,
    contact: enContact,
    notFound: enNotFound,
    diagnostic: enDiagnostic,
    whitepaper: enWhitepaper,
    profile: enProfile,
    terms: enTerms,
    privacy: enPrivacy,
    shippingReturns: enShippingReturns,
    productSparklingBottle: enProductSparklingBottle,
    productSparklingCan: enProductSparklingCan,
    productSparklingMain: enProductSparklingMain,
    productWine: enProductWine,
    mango: enMango,
    passionFruit: enPassionFruit,
    whyCans: enWhyCans,
    vineAndBarrel: enVineAndBarrel,
    adminOrders: enAdminOrders,
    adminProducts: enAdminProducts,
    adminProductForm: enAdminProductForm,
    adminCustomers: enAdminCustomers,
    adminCoupons: enAdminCoupons,
    adminAnalytics: enAdminAnalytics,
    adminShipping: enAdminShipping,
    adminApiKeys: enAdminApiKeys,
    adminLogs: enAdminLogs,
    adminNewsletter: enAdminNewsletter,
    adminSocialDashboard: enAdminSocialDashboard,
    adminSocialSettings: enAdminSocialSettings,
    adminBlog: enAdminBlog,
    adminBlogForm: enAdminBlogForm,
    adminEmailDashboard: enAdminEmailDashboard,
    adminEmailContacts: enAdminEmailContacts,
    adminEmailCampaigns: enAdminEmailCampaigns,
    adminEmailComposer: enAdminEmailComposer,
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
    ns: [
      'common', 'nav', 'footer', 'home', 'shop', 'product', 'cart', 'checkout', 'about',
      'login', 'register', 'verifyOtp', 'blogLogin',
      'contact', 'notFound', 'diagnostic', 'whitepaper', 'profile',
      'terms', 'privacy', 'shippingReturns',
      'productSparklingBottle', 'productSparklingCan', 'productSparklingMain', 'productWine',
      'mango', 'passionFruit', 'whyCans', 'vineAndBarrel',
      'adminOrders', 'adminProducts', 'adminProductForm', 'adminCustomers',
      'adminCoupons', 'adminAnalytics', 'adminShipping',
      'adminApiKeys', 'adminLogs', 'adminNewsletter',
      'adminSocialDashboard', 'adminSocialSettings',
      'adminBlog', 'adminBlogForm',
      'adminEmailDashboard', 'adminEmailContacts', 'adminEmailCampaigns', 'adminEmailComposer',
    ],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'kibay_lang',
    },
  });

export default i18n;
