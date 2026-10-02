import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMail, HiOutlineArrowLeft } from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './AuthPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      // Don't reveal if email exists or not (security)
      toast.success('If an account with that email exists, a reset link has been sent.');
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
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
          <h1>{isSent ? 'Check Your Email' : 'Forgot Password?'}</h1>
          <p>
            {isSent
              ? `We've sent a password reset link to ${email}`
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <HiOutlineMail className="input-icon" size={18} />
                <input
                  type="email"
                  className="input input-with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', margin: 'var(--space-lg) 0' }}>📧</div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-lg)' }}>
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => { setIsSent(false); setEmail(''); }}
                style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'underline' }}
              >
                try again
              </button>
            </p>
          </div>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <HiOutlineArrowLeft size={16} /> Back to Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
