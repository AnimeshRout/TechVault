import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineTrash, HiOutlinePlus, HiOutlineMinus, HiOutlineShoppingCart } from 'react-icons/hi';
import useCartStore from '../../stores/cartStore';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';
import './CartPage.css';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, updateQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated]);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.discountPrice > 0 ? item.product.discountPrice : item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + shipping + tax;

  const handleUpdateQty = async (itemId, newQty) => {
    try { await updateQuantity(itemId, newQty); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handleRemove = async (itemId) => {
    try { await removeItem(itemId); toast.success('Removed from cart'); }
    catch { toast.error('Failed to remove'); }
  };

  if (!isAuthenticated) {
    return (
      <div className="cart-page"><div className="container">
        <div className="empty-state">
          <p className="empty-icon">🛒</p>
          <h3>Please sign in to view your cart</h3>
          <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Sign In</Link>
        </div>
      </div></div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page"><div className="container">
        <div className="empty-state">
          <p className="empty-icon">🛒</p>
          <h3>Your cart is empty</h3>
          <p>Discover amazing tech products and add them to your cart</p>
          <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Browse Products</Link>
        </div>
      </div></div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="section-title">Shopping Cart</h1>
        <p className="section-subtitle">{items.length} item{items.length !== 1 && 's'} in your cart</p>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items">
            <AnimatePresence>
              {items.map((item) => {
                const p = item.product;
                if (!p) return null;
                const price = p.discountPrice > 0 ? p.discountPrice : p.price;
                return (
                  <motion.div
                    key={item._id}
                    className="cart-item glass-card"
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Link to={`/product/${p.slug}`} className="cart-item-img-link">
                      <img src={p.images?.[0]} alt={p.title} className="cart-item-img" />
                    </Link>
                    <div className="cart-item-info">
                      <Link to={`/product/${p.slug}`} className="cart-item-title">{p.title}</Link>
                      <p className="cart-item-brand">{p.brand}</p>
                      <p className="cart-item-price">${price.toLocaleString()}</p>
                    </div>
                    <div className="cart-item-actions">
                      <div className="quantity-selector">
                        <button onClick={() => handleUpdateQty(item._id, Math.max(1, item.quantity - 1))} disabled={item.quantity <= 1}>
                          <HiOutlineMinus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleUpdateQty(item._id, item.quantity + 1)}>
                          <HiOutlinePlus size={14} />
                        </button>
                      </div>
                      <p className="cart-item-subtotal">${(price * item.quantity).toLocaleString()}</p>
                      <button className="btn btn-ghost btn-icon cart-remove-btn" onClick={() => handleRemove(item._id)}>
                        <HiOutlineTrash size={18} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="cart-summary glass-card">
            <h3>Order Summary</h3>
            <div className="summary-rows">
              <div className="summary-row"><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
              <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping}`}</span></div>
              <div className="summary-row"><span>Tax (8%)</span><span>${tax.toLocaleString()}</span></div>
              <div className="summary-divider" />
              <div className="summary-row summary-total"><span>Total</span><span>${total.toLocaleString()}</span></div>
            </div>
            {shipping === 0 && (
              <p className="free-shipping-note">✅ You qualify for free shipping!</p>
            )}
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => clearCart()}>
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
