import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiOutlineUser } from 'react-icons/hi';
import useAuthStore from '../../stores/authStore';
import useCartStore from '../../stores/cartStore';
import GoogleIcon from '../../components/ui/GoogleIcon';
import toast from 'react-hot-toast';
import './AuthPage.css';

const BACKEND_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') || window.location.origin;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading, error, clearError, checkAuth } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // Handle Google OAuth redirect
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    if (googleAuth === 'success') {
      checkAuth().then(() => {
        fetchCart();
        toast.success('Signed up with Google!');
        navigate('/', { replace: true });
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await register(form.name, form.email, form.password);
      await fetchCart();
      toast.success('Account created! Welcome to TechVault.');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGoogleSignup = () => {
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
          <Link to="/" className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><img src="/logo.png" alt="TechVault" style={{ height: '32px' }} /> TechVault</Link>
          <h1>Create Account</h1>
          <p>Join TechVault and start shopping the best tech</p>
        </div>

        {/* Google Sign-Up Button */}
        <button className="btn-google" onClick={handleGoogleSignup} type="button">
          <GoogleIcon size={20} />
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or sign up with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <HiOutlineUser className="input-icon" size={18} />
              <input
                type="text"
                className="input input-with-icon"
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required minLength={2}
              />
            </div>
          </div>

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
                placeholder="Min 8 chars, uppercase, number, special"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required minLength={8}
              />
              <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
