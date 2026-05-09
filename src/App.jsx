
import React, { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './contexts/SupabaseAuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';

// Pages (lazy)
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const WhyCansPage = lazy(() => import('./pages/WhyCansPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const WhitepaperPage = lazy(() => import('./pages/WhitepaperPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const VineAndBarrelPage = lazy(() => import('./pages/VineAndBarrelPage'));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage'));

// Ingredient Pages
const MangoPage = lazy(() => import('./pages/MangoPage'));
const PassionFruitPage = lazy(() => import('./pages/PassionFruitPage'));

// Legal & Policy Pages
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const ShippingReturnsPolicyPage = lazy(() => import('./pages/ShippingReturnsPolicyPage'));

// Product Landing Pages
const KibayEspumanteCan = lazy(() => import('./pages/KibayEspumanteCan'));
const KibayEspumanteBottle = lazy(() => import('./pages/KibayEspumanteBottle'));
const KibayEspumanteProductPage = lazy(() => import('./pages/KibayEspumanteProductPage'));
const KibayWineProductPage = lazy(() => import('./pages/KibayWineProductPage'));

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const BlogLoginPage = lazy(() => import('./pages/auth/BlogLoginPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

// Blog Pages
const PublicBlogPage = lazy(() => import('./components/PublicBlogPage'));
const BlogPostDetailPage = lazy(() => import('./components/BlogPostDetailPage'));
const BlogAdminDashboard = lazy(() => import('./components/BlogAdminDashboard'));
const BlogPostForm = lazy(() => import('./components/BlogPostForm'));
const UnsubscribePage = lazy(() => import('./components/UnsubscribePage'));

// Admin Social Pages
const AdminSocialMediaDashboard = lazy(() => import('./pages/admin/AdminSocialMediaDashboard'));
const AdminSocialMediaSettings = lazy(() => import('./pages/admin/AdminSocialMediaSettings'));
const AdminLogsViewer = lazy(() => import('./pages/admin/AdminLogsViewer'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('./pages/admin/AdminProductFormPage'));
const AdminApiKeysPage = lazy(() => import('./pages/admin/AdminApiKeysPage'));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminNewsletterPage = lazy(() => import('./pages/admin/AdminNewsletterPage'));
const AdminShippingPage = lazy(() => import('./pages/admin/AdminShippingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Sitemap is served as a static file at /sitemap.xml (built by
// tools/generate-sitemap.js); the old SitemapRenderer SPA component is no
// longer used.

function HtmlLangSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || 'es';
  }, [i18n.resolvedLanguage]);
  return null;
}

function App() {
  return (
    <CartProvider>
      <AuthProvider>
        <HtmlLangSync />
        <Router>
          <a href="#main" className="skip-to-content">Skip to main content</a>
          <ScrollToTop />
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/vine-and-barrel" element={<VineAndBarrelPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />

              <Route path="/mango" element={<MangoPage />} />
              <Route path="/passion-fruit" element={<PassionFruitPage />} />

              <Route path="/kibay-sparkling" element={<KibayEspumanteProductPage />} />
              <Route path="/kibay-wine" element={<KibayWineProductPage />} />

              {/* Ecommerce Routes */}
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout-success" element={<CheckoutSuccessPage />} />

              {/* Legal Routes */}
              <Route path="/terms" element={<TermsAndConditionsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/shipping-returns" element={<ShippingReturnsPolicyPage />} />

              {/* Legacy/Specific Product Routes */}
              <Route path="/kibay-espumante-can" element={<KibayEspumanteCan />} />
              <Route path="/kibay-espumante-bottle" element={<KibayEspumanteBottle />} />

              <Route path="/why-cans" element={<WhyCansPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/whitepaper" element={<WhitepaperPage />} />
              <Route path="/contact" element={<ContactPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/blog/login" element={<BlogLoginPage />} />

              {/* Blog Public Routes */}
              <Route path="/blog" element={<PublicBlogPage />} />
              <Route path="/blog/:id" element={<BlogPostDetailPage />} />
              <Route path="/unsubscribe/:email" element={<UnsubscribePage />} />

              {/* /sitemap.xml is served as a static file generated at build
                  time by tools/generate-sitemap.js — Vite copies it from
                  public/ into dist/, CF Pages serves it with the right
                  application/xml content-type. The React route was a
                  client-side SPA component and Googlebot couldn't read it. */}

              {/* Protected Routes */}
              <Route path="/account" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/dashboard/blog" element={<ProtectedAdminRoute><BlogAdminDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/blog/create" element={<ProtectedAdminRoute><BlogPostForm /></ProtectedAdminRoute>} />
              <Route path="/admin/blog/:id/edit" element={<ProtectedAdminRoute><BlogPostForm /></ProtectedAdminRoute>} />

              <Route path="/admin/social-media" element={<ProtectedAdminRoute><AdminSocialMediaDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/social-media/settings" element={<ProtectedAdminRoute><AdminSocialMediaSettings /></ProtectedAdminRoute>} />
              <Route path="/admin/social-media/logs" element={<ProtectedAdminRoute><AdminLogsViewer /></ProtectedAdminRoute>} />
              <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrdersPage /></ProtectedAdminRoute>} />
              <Route path="/admin/products" element={<ProtectedAdminRoute><AdminProductsPage /></ProtectedAdminRoute>} />
              <Route path="/admin/products/new" element={<ProtectedAdminRoute><AdminProductFormPage /></ProtectedAdminRoute>} />
              <Route path="/admin/products/:id/edit" element={<ProtectedAdminRoute><AdminProductFormPage /></ProtectedAdminRoute>} />
              <Route path="/admin/api-keys" element={<ProtectedAdminRoute><AdminApiKeysPage /></ProtectedAdminRoute>} />
              <Route path="/admin/customers" element={<ProtectedAdminRoute><AdminCustomersPage /></ProtectedAdminRoute>} />
              <Route path="/admin/coupons" element={<ProtectedAdminRoute><AdminCouponsPage /></ProtectedAdminRoute>} />
              <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminAnalyticsPage /></ProtectedAdminRoute>} />
              <Route path="/admin/newsletter" element={<ProtectedAdminRoute><AdminNewsletterPage /></ProtectedAdminRoute>} />
              <Route path="/admin/shipping" element={<ProtectedAdminRoute><AdminShippingPage /></ProtectedAdminRoute>} />

              {/* 404 catch-all — must stay LAST */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <CookieConsent />
        </Router>
      </AuthProvider>
    </CartProvider>
  );
}

export default App;
