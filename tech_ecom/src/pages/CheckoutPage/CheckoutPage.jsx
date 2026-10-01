import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineLocationMarker, HiOutlineCreditCard, HiOutlineCheck, HiOutlineTag, HiOutlinePencil } from 'react-icons/hi';
import useCartStore from '../../stores/cartStore';
import useAuthStore from '../../stores/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, resetCart } = useCartStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Address state
  const hasSavedAddress = user?.addresses?.length > 0;
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const [address, setAddress] = useState({
    fullName: '', phone: '', street: '', city: '', state: '', zipCode: '', country: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Steps: dynamically determine whether to show address step
  const needsAddress = !hasSavedAddress;
  const steps = needsAddress
    ? ['Shipping', 'Review', 'Payment']
    : ['Review', 'Payment'];

  const [currentStep, setCurrentStep] = useState(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchCart();

    // Set address from saved default
    if (hasSavedAddress && defaultAddress) {
      setAddress({
        fullName: defaultAddress.fullName || '',
        phone: defaultAddress.phone || '',
        street: defaultAddress.street || '',
        city: defaultAddress.city || '',
        state: defaultAddress.state || '',
        zipCode: defaultAddress.zipCode || '',
        country: defaultAddress.country || '',
      });
    }
  }, []);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.discountPrice > 0 ? item.product.discountPrice : item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const tax = Math.round((subtotal - discount) * 0.08 * 100) / 100;
  const total = Math.round((subtotal - discount + shipping + tax) * 100) / 100;

  // ─── Coupon handlers ───────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/coupons/validate', {
        code: couponCode.trim(), orderTotal: subtotal,
      });
      const coupon = data.data.coupon;
      setAppliedCoupon(coupon);
      let disc = 0;
      if (coupon.type === 'percentage') {
        disc = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
        if (coupon.maxDiscount) disc = Math.min(disc, coupon.maxDiscount);
      } else disc = coupon.value;
      setDiscount(disc);
      toast.success(`Coupon applied! You save $${disc.toFixed(2)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setAppliedCoupon(null); setDiscount(0);
    } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null); setDiscount(0); setCouponCode('');
    toast('Coupon removed');
  };

  // ─── Validate address ─────────────────────────────────────────────
  const validateAddress = () => {
    const required = ['fullName', 'phone', 'street', 'city', 'state', 'zipCode', 'country'];
    for (const field of required) {
      if (!address[field]?.trim()) { toast.error(`Please fill in ${field}`); return false; }
    }
    return true;
  };

  // ─── Save address to profile if new ────────────────────────────────
  const saveAddressIfNew = async () => {
    if (!hasSavedAddress) {
      try {
        await api.post('/users/address', { ...address, isDefault: true });
        const { data } = await api.get('/auth/me');
        useAuthStore.setState({ user: data.data.user });
      } catch (err) { console.warn('Failed to save address:', err); }
    }
  };

  const handleAddressContinue = () => {
    if (!validateAddress()) return;
    saveAddressIfNew();
    setCurrentStep(1);
    setShowAddressForm(false);
  };

  // ─── Place order then handle payment ───────────────────────────────
  const handlePlaceOrder = async () => {
    if (!validateAddress()) {
      if (needsAddress) setCurrentStep(0);
      else setShowAddressForm(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Place order
      const { data } = await api.post('/orders', {
        shippingAddress: address,
        paymentMethod: paymentMethod === 'stripe' ? 'stripe' : 'cod',
        couponCode: appliedCoupon?.code || undefined,
      });
      const order = data.data.order;

      if (paymentMethod === 'stripe') {
        // 2. Create Stripe Checkout Session & redirect
        const { data: sessionData } = await api.post(`/orders/${order._id}/checkout-session`, {
          orderId: order._id,
        });
        resetCart();

        // Redirect to Stripe's hosted checkout page
        window.location.href = sessionData.data.url;
        return; // page will navigate away
      }

      // COD — just navigate to orders
      toast.success('Order placed successfully!');
      resetCart();
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step content ──────────────────────────────────────────────────
  const getStepContent = () => {
    const stepName = steps[currentStep];

    if (stepName === 'Shipping') {
      return (
        <motion.div className="checkout-card glass-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h3><HiOutlineLocationMarker size={20} /> Shipping Address</h3>
          {renderAddressForm()}
          <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={handleAddressContinue}>
            Continue to Review
          </button>
        </motion.div>
      );
    }

    if (stepName === 'Review') {
      return (
        <motion.div className="checkout-card glass-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h3>Review Your Order</h3>
          <div className="review-items">
            {items.map((item) => {
              const p = item.product;
              if (!p) return null;
              const price = p.discountPrice > 0 ? p.discountPrice : p.price;
              return (
                <div key={item._id} className="review-item">
                  <img src={p.images?.[0]} alt={p.title} className="review-item-img" />
                  <div className="review-item-info">
                    <p className="review-item-title">{p.title}</p>
                    <p className="review-item-qty">{item.quantity} × ${price.toLocaleString()}</p>
                  </div>
                  <p className="review-item-total">${(price * item.quantity).toLocaleString()}</p>
                </div>
              );
            })}
          </div>

          {/* Shipping address summary */}
          <div className="review-address">
            <div className="review-address-header">
              <h4>Shipping to:</h4>
              <button className="btn btn-ghost btn-sm change-address-btn" onClick={() => setShowAddressForm(!showAddressForm)}>
                <HiOutlinePencil size={14} /> {showAddressForm ? 'Cancel' : 'Change'}
              </button>
            </div>
            {!showAddressForm ? (
              <>
                <p>{address.fullName}, {address.phone}</p>
                <p>{address.street}, {address.city}, {address.state} {address.zipCode}</p>
                <p>{address.country}</p>
              </>
            ) : (
              <div style={{ marginTop: 12 }}>
                {renderAddressForm()}
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                  onClick={() => { if (validateAddress()) setShowAddressForm(false); }}>
                  Save Address
                </button>
              </div>
            )}
          </div>

          <div className="checkout-step-actions">
            {needsAddress && <button className="btn btn-secondary" onClick={() => setCurrentStep(0)}>← Back</button>}
            <button className="btn btn-primary btn-lg" onClick={() => setCurrentStep(currentStep + 1)}>
              Continue to Payment
            </button>
          </div>
        </motion.div>
      );
    }

    if (stepName === 'Payment') {
      return (
        <motion.div className="checkout-card glass-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h3><HiOutlineCreditCard size={20} /> Payment</h3>
          <div className="payment-options">
            <div className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`} onClick={() => setPaymentMethod('cod')}>
              <span>💰 Cash on Delivery</span>
              <p className="payment-note">Pay when your order arrives</p>
            </div>

            <div className={`payment-option ${paymentMethod === 'stripe' ? 'active' : ''}`} onClick={() => setPaymentMethod('stripe')}>
              <span>💳 Online Payment</span>
              <p className="payment-note">Pay securely via Stripe — you'll be redirected to the payment page</p>
            </div>
          </div>

          <div className="checkout-step-actions">
            <button className="btn btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'Processing...' : paymentMethod === 'stripe' ? `Pay $${total.toLocaleString()} →` : `Place Order — $${total.toLocaleString()}`}
            </button>
          </div>
        </motion.div>
      );
    }
  };

  // ─── Reusable address form ─────────────────────────────────────────
  const renderAddressForm = () => (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input className="input" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input className="input" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Street Address</label>
        <input className="input" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">City</label>
        <input className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">State</label>
        <input className="input" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">ZIP Code</label>
        <input className="input" value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Country</label>
        <input className="input" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="checkout-page"><div className="container">
        <div className="empty-state">
          <p className="empty-icon">🛒</p>
          <h3>Your cart is empty</h3>
          <p>Add items to your cart before checkout</p>
        </div>
      </div></div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 className="section-title">Checkout</h1>

        {/* Stepper */}
        <div className="stepper">
          {steps.map((step, i) => (
            <div key={step} className={`step ${i <= currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
              <div className="step-circle">
                {i < currentStep ? <HiOutlineCheck size={16} /> : i + 1}
              </div>
              <span className="step-label">{step}</span>
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          <div className="checkout-main">{getStepContent()}</div>

          {/* Order Summary Sidebar */}
          <div className="checkout-summary glass-card">
            <h3>Order Summary</h3>
            <div className="coupon-section">
              {appliedCoupon ? (
                <div className="coupon-applied">
                  <div className="coupon-badge">
                    <HiOutlineTag size={16} /><span>{appliedCoupon.code}</span>
                    <span className="coupon-savings">−${discount.toFixed(2)}</span>
                  </div>
                  <button className="coupon-remove" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div className="coupon-input-row">
                  <input type="text" className="input coupon-input" placeholder="Coupon code"
                    value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()} />
                  <button className="btn btn-secondary coupon-apply-btn" onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
            <div className="summary-rows">
              <div className="summary-row"><span>Subtotal ({items.length} items)</span><span>${subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="summary-row summary-discount"><span>Discount</span><span>−${discount.toFixed(2)}</span></div>}
              <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping}`}</span></div>
              <div className="summary-row"><span>Tax (8%)</span><span>${tax.toLocaleString()}</span></div>
              <div className="summary-divider" />
              <div className="summary-row summary-total"><span>Total</span><span>${total.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
