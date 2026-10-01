import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';
import useCartStore from './stores/cartStore';
import useThemeStore from './stores/themeStore';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Eagerly loaded (critical path)
import HomePage from './pages/HomePage/HomePage';

// Lazy loaded (code-split by route)
const ProductsPage = lazy(() => import('./pages/ProductsPage/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage/CartPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage/OrdersPage'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage/CheckoutPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage/WishlistPage'));
const LegalPages = lazy(() => import('./pages/LegalPages/LegalPages'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

// Route loading fallback
function RouteFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--color-text-muted)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{
          width: 36, height: 36, border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Main content area with navbar offset
function AppContent() {
  return (
    <div style={{ paddingTop: 'var(--navbar-height)' }}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/legal/:page" element={<LegalPages />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Init theme + check auth on mount
  useEffect(() => {
    useThemeStore.getState().initTheme();
    checkAuth();
  }, []);

  // Fetch cart once authenticated
  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated]);

  return (
    <Router>
      <ScrollToTop />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'var(--color-bg-elevated)' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'var(--color-bg-elevated)' } },
        }}
      />

      <Navbar />
      <AppContent />
      <Footer />
    </Router>
  );
}
