
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { CartProvider } from './hooks/useCart';
import { AuthProvider } from './contexts/SupabaseAuthContext';

// Pages
import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import WhyCansPage from './pages/WhyCansPage';
import AboutPage from './pages/AboutPage';
import WhitepaperPage from './pages/WhitepaperPage';
import ContactPage from './pages/ContactPage';
import VineAndBarrelPage from './pages/VineAndBarrelPage';
import DiagnosticPage from './pages/DiagnosticPage';

// Ingredient Pages
import MangoPage from './pages/MangoPage';
import PassionFruitPage from './pages/PassionFruitPage';

// Legal & Policy Pages
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ShippingReturnsPolicyPage from './pages/ShippingReturnsPolicyPage';

// Product Landing Pages
import KibayEspumanteCan from './pages/KibayEspumanteCan';
import KibayEspumanteBottle from './pages/KibayEspumanteBottle';
import KibayEspumanteProductPage from './pages/KibayEspumanteProductPage';
import KibayWineProductPage from './pages/KibayWineProductPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BlogLoginPage from './pages/auth/BlogLoginPage';
import UserProfilePage from './pages/UserProfilePage';

// Blog Pages
import PublicBlogPage from './components/PublicBlogPage';
import BlogPostDetailPage from './components/BlogPostDetailPage';
import BlogAdminDashboard from './components/BlogAdminDashboard';
import BlogPostForm from './components/BlogPostForm';
import UnsubscribePage from './components/UnsubscribePage';

// Admin Social Pages
import AdminSocialMediaDashboard from './pages/admin/AdminSocialMediaDashboard';
import AdminSocialMediaSettings from './pages/admin/AdminSocialMediaSettings';
import AdminLogsViewer from './pages/admin/AdminLogsViewer';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

// Utilities
import SitemapRenderer from './pages/SitemapRenderer';

function App() {
  return (
    <CartProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
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
            <Route path="/product/:id" element={<ProductDetailPage />} />
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
            
            {/* Dynamic Sitemap */}
            <Route path="/sitemap.xml" element={<SitemapRenderer />} />

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

          </Routes>
        </Router>
      </AuthProvider>
    </CartProvider>
  );
}

export default App;
