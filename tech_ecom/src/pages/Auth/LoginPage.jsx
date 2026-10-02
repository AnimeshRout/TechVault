import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import useAuthStore from '../../stores/authStore';
import useCartStore from '../../stores/cartStore';
import GoogleIcon from '../../components/ui/GoogleIcon';
import toast from 'react-hot-toast';
import './AuthPage.css';

// Backend root URL (without /api suffix) for Google OAuth redirects
const BACKEND_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') || window.location.origin;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError, checkAuth } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  // Handle Google OAuth redirect
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    const googleError = searchParams.get('error');

    if (googleAuth === 'success') {
      checkAuth().then(() => {
        fetchCart();
        toast.success('Signed in with Google!');
        navigate('/', { replace: true });
      });
    }
    if (googleError) {
      toast.error(googleError === 'google_auth_failed' ? 'Google sign-in failed' : 'Authentication error');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await login(form.email, form.password);
      await fetchCart();
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google?from=user`;
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <motion.div
        className="auth-card glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}><img src="/logo.png" alt="TechVault" style={{ height: '32px' }} /> TechVault</Link>
          <h1>Welcome Back</h1>
          <p>Sign in to your account to continue shopping</p>
        </div>

        {/* Google Sign-In Button */}
        <button className="btn-google" onClick={handleGoogleLogin} type="button">
          <GoogleIcon size={20} />
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <HiOutlineMail className="input-icon" size={18} />
              <input
                type="email"
                className="input input-with-icon"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <HiOutlineLockClosed className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-with-icon"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </button>
            </div>
            <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
        </p>

        <div className="auth-demo">
          <p className="demo-label">Demo Accounts:</p>
          <button className="btn btn-ghost btn-sm" onClick={() => setForm({ email: 'user@techvault.com', password: 'User@123' })}>
            User Account
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setForm({ email: 'admin@techvault.com', password: 'Admin@123' })}>
            Admin Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
