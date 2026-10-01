import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineDownload, HiOutlineRefresh, HiOutlineX, HiOutlineBan, HiOutlineCreditCard } from 'react-icons/hi';
import api from '../../api/axios';
import useAuthStore from '../../stores/authStore';
import useCartStore from '../../stores/cartStore';
import toast from 'react-hot-toast';
import './OrdersPage.css';

const statusColors = {
  Placed: 'badge-primary',
  Processing: 'badge-warning',
  Shipped: 'badge-primary',
  Delivered: 'badge-success',
  Cancelled: 'badge-error',
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ items: [], reason: '' });
  const [returningLoading, setReturningLoading] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(null); // orderId being processed

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/orders/my')
      .then(({ data }) => { setOrders(data.data.orders); setLoading(false); })
      .catch(() => setLoading(false));

    // Handle Stripe payment redirect — verify payment
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const paymentOrderId = params.get('orderId');
    if (paymentStatus === 'success' && paymentOrderId) {
      api.get(`/orders/${paymentOrderId}/verify-payment`).then(({ data }) => {
        if (data.data.paymentStatus === 'completed') {
          toast.success('Payment successful! Order confirmed.');
          // Refresh orders to show updated status
          api.get('/orders/my').then(({ data }) => setOrders(data.data.orders)).catch(() => {});
        }
      }).catch(() => {});
      // Clean URL params
      window.history.replaceState({}, '', '/orders');
    } else if (paymentStatus === 'cancelled') {
      toast('Payment was cancelled. You can retry from your orders.');
      window.history.replaceState({}, '', '/orders');
    }
  }, [isAuthenticated]);

  const handleDownloadInvoice = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  // ─── Cancel Order ──────────────────────────────────────────────────
  const handleCancelOrder = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      const { data } = await api.put(`/orders/${cancelModal}/cancel`, {
        reason: cancelReason || 'Cancelled by user',
      });

      // Remove the cancelled order from the list immediately
      setOrders((prev) => prev.filter((o) => o._id !== cancelModal));

      // Refresh cart
      await fetchCart();

      // Show appropriate message
      if (data.data?.refunded) {
        toast.success(`Order cancelled! Refund of $${data.data.refundAmount.toFixed(2)} initiated to your card. You'll receive an email confirmation.`, { duration: 6000 });
      } else {
        toast.success('Order cancelled and removed. You\'ll receive an email confirmation.');
      }
      setCancelModal(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  // ─── Pay Now (switch COD to online / retry failed payment) ─────────
  const handlePayNow = async (orderId) => {
    setPayNowLoading(orderId);
    try {
      const { data } = await api.post(`/orders/${orderId}/checkout-session`, { orderId });
      // Redirect to Stripe Checkout
      window.location.href = data.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setPayNowLoading(null);
    }
  };

  // ─── Return ────────────────────────────────────────────────────────
  const openReturnModal = (order) => {
    setReturnModal(order._id);
    setReturnForm({
      items: order.orderItems?.map((item) => ({
        product: item.product,
        title: item.title || 'Product',
        quantity: item.quantity,
        returnQty: 0,
      })) || [],
      reason: '',
    });
  };

  const handleSubmitReturn = async () => {
    const selectedItems = returnForm.items.filter((i) => i.returnQty > 0);
    if (selectedItems.length === 0) return toast.error('Select at least one item to return');
    if (!returnForm.reason.trim()) return toast.error('Please provide a reason');

    setReturningLoading(true);
    try {
      await api.post('/returns', {
        orderId: returnModal,
        items: selectedItems.map((i) => ({ product: i.product, quantity: i.returnQty })),
        reason: returnForm.reason,
      });
      toast.success('Return request submitted!');
      setReturnModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return request failed');
    } finally {
      setReturningLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="orders-page"><div className="container">
        <div className="empty-state">
          <p className="empty-icon">📦</p>
          <h3>Please sign in to view your orders</h3>
          <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Sign In</Link>
        </div>
      </div></div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        <h1 className="section-title">My Orders</h1>
        <p className="section-subtitle">{orders.length} order{orders.length !== 1 && 's'}</p>

        {loading ? (
          <div className="orders-loading">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📦</p>
            <h3>No orders yet</h3>
            <p>Start shopping to see your orders here</p>
            <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>Browse Products</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order, i) => (
              <motion.div
                key={order._id}
                className="order-card glass-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="order-header">
                  <div>
                    <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="order-date">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <span className={`badge ${statusColors[order.orderStatus] || 'badge-primary'}`}>
                    {order.orderStatus}
                  </span>
                </div>

                {/* Tracking info */}
                {order.trackingNumber && (
                  <div className="order-tracking">
                    <span className="tracking-label">Tracking:</span>
                    <span className="tracking-number">{order.carrier || 'Carrier'} — {order.trackingNumber}</span>
                  </div>
                )}

                {/* Order Items */}
                <div className="order-items">
                  {(order.orderItems || order.items || []).slice(0, 3).map((item) => (
                    <div key={item._id} className="order-item">
                      <img src={item.image || item.product?.images?.[0]} alt="" className="order-item-img" />
                      <div className="order-item-info">
                        <p className="order-item-title">{item.title || item.product?.title || 'Product'}</p>
                        <p className="order-item-qty">Qty: {item.quantity} × ${item.unitPrice || item.price}</p>
                      </div>
                    </div>
                  ))}
                  {(order.orderItems || order.items || []).length > 3 && (
                    <p className="order-more">+{(order.orderItems || order.items).length - 3} more item(s)</p>
                  )}
                </div>

                {/* Payment Method & Status */}
                <div className="order-payment-info">
                  <span className="payment-method-badge">
                    {order.paymentResult?.method === 'cod' ? '💰 Cash on Delivery' : '💳 Online Payment'}
                  </span>
                  {order.paymentResult?.status && (
                    <span className={`payment-status ${order.paymentResult.status}`}>
                      {order.paymentResult.status === 'completed' ? '✓ Paid' :
                       order.paymentResult.status === 'pending' ? '⏳ Pending' :
                       order.paymentResult.status === 'failed' ? '✗ Failed' : order.paymentResult.status}
                    </span>
                  )}

                  {/* Pay Now button for unpaid orders */}
                  {order.paymentResult?.status !== 'completed' &&
                   !['Cancelled', 'Delivered'].includes(order.orderStatus) && (
                    <button
                      className="btn btn-primary btn-sm pay-now-btn"
                      onClick={() => handlePayNow(order._id)}
                      disabled={payNowLoading === order._id}
                    >
                      <HiOutlineCreditCard size={14} />
                      {payNowLoading === order._id ? 'Redirecting...' : 'Pay Now'}
                    </button>
                  )}
                </div>

                <div className="order-footer">
                  <p className="order-total">Total: <strong>${order.pricing?.total?.toLocaleString()}</strong></p>
                  <div className="order-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDownloadInvoice(order._id)}
                      title="Download Invoice"
                    >
                      <HiOutlineDownload size={16} /> Invoice
                    </button>

                    {/* Cancel button */}
                    {!['Delivered', 'Cancelled'].includes(order.orderStatus) && (
                      <button
                        className="btn btn-ghost btn-sm btn-cancel-order"
                        onClick={() => setCancelModal(order._id)}
                        title="Cancel Order"
                      >
                        <HiOutlineBan size={16} /> Cancel
                      </button>
                    )}

                    {order.orderStatus === 'Delivered' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openReturnModal(order)}
                        title="Request Return"
                      >
                        <HiOutlineRefresh size={16} /> Return
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCancelModal(null)}
          >
            <motion.div
              className="modal-content glass-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Cancel Order</h3>
                <button className="modal-close" onClick={() => setCancelModal(null)}>
                  <HiOutlineX size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="cancel-warning">
                  <HiOutlineBan size={32} />
                  <p>Are you sure you want to cancel this order?</p>
                  <p className="cancel-warning-sub">This action cannot be undone. Your stock will be restored.</p>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Reason for Cancellation (Optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Tell us why you're cancelling..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setCancelModal(null)}>Keep Order</button>
                <button className="btn btn-danger" onClick={handleCancelOrder} disabled={cancelLoading}>
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Request Modal */}
      <AnimatePresence>
        {returnModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReturnModal(null)}
          >
            <motion.div
              className="modal-content glass-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Request Return</h3>
                <button className="modal-close" onClick={() => setReturnModal(null)}>
                  <HiOutlineX size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="modal-description">Select items and quantities to return:</p>
                <div className="return-items">
                  {returnForm.items.map((item, idx) => (
                    <div key={idx} className="return-item-row">
                      <span className="return-item-title">{item.title}</span>
                      <div className="return-qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => {
                            const updated = [...returnForm.items];
                            updated[idx].returnQty = Math.max(0, updated[idx].returnQty - 1);
                            setReturnForm({ ...returnForm, items: updated });
                          }}
                        >−</button>
                        <span className="qty-display">{item.returnQty} / {item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => {
                            const updated = [...returnForm.items];
                            updated[idx].returnQty = Math.min(updated[idx].quantity, updated[idx].returnQty + 1);
                            setReturnForm({ ...returnForm, items: updated });
                          }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Reason for Return</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Please describe why you're returning these items..."
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setReturnModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmitReturn} disabled={returningLoading}>
                  {returningLoading ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
