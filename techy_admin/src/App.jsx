import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';
import useThemeStore from './stores/themeStore';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', color:'var(--color-text-muted)' }}>Loading...</div>;
  if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0,0); }, [pathname]); return null; }

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => { useThemeStore.getState().initTheme(); checkAuth(); }, []);

  return (
    <Router>
      <ScrollToTop />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background:'var(--color-bg-card)', color:'var(--color-text-primary)', border:'1px solid var(--color-border)', borderRadius:'12px', fontSize:'0.875rem' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><AdminLayout><Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes></AdminLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
