import { useEffect, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import api from '../api/axios';
import toast from 'react-hot-toast';

const statuses = ['Placed','Processing','Shipped','Delivered','Cancelled'];
const statusColors = { Placed:'badge-primary', Processing:'badge-warning', Shipped:'badge-primary', Delivered:'badge-success', Cancelled:'badge-error' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selected, setSelected] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/orders?page=${page}&limit=10&sort=-createdAt`);
      setOrders(data.data.orders || []); setPagination(data.pagination || {});
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { orderStatus: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      fetchOrders();
      if (selected?._id === orderId) setSelected({...selected, orderStatus: newStatus});
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">{pagination.totalProducts || orders.length} orders total</p></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap:'1rem' }}>
        <div className="card">
          {loading ? <p style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-muted)' }}>Loading...</p> : (
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} onClick={() => setSelected(o)} style={{ cursor:'pointer', background: selected?._id === o._id ? 'var(--color-bg-tertiary)' : 'transparent' }}>
                    <td style={{ fontWeight:600, fontFamily:'monospace', fontSize:'0.75rem' }}>#{o._id.slice(-8).toUpperCase()}</td>
                    <td>{o.user?.name || 'N/A'}<br/><span style={{ fontSize:'0.6875rem', color:'var(--color-text-muted)' }}>{o.user?.email}</span></td>
                    <td>{o.orderItems?.length || 0}</td>
                    <td style={{ fontWeight:600 }}>${o.pricing?.total?.toLocaleString()}</td>
                    <td>
                      <select className="status-select" value={o.orderStatus} onChange={(e) => { e.stopPropagation(); updateStatus(o._id, e.target.value); }}>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={() => setPage(page-1)}>Prev</button>
              <span style={{ fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>Page {page} of {pagination.totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page>=pagination.totalPages} onClick={() => setPage(page+1)}>Next</button>
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={{ alignSelf:'start', position:'sticky', top:'4rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h3 style={{ fontSize:'0.9375rem', fontWeight:600 }}>Order Detail</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <p style={{ fontSize:'0.75rem', color:'var(--color-text-muted)', marginBottom:'0.5rem' }}>ID: {selected._id}</p>
            <p style={{ fontSize:'0.8125rem', marginBottom:'0.25rem' }}><strong>Customer:</strong> {selected.user?.name}</p>
            <p style={{ fontSize:'0.8125rem', marginBottom:'0.25rem' }}><strong>Email:</strong> {selected.user?.email}</p>
            <p style={{ fontSize:'0.8125rem', marginBottom:'0.25rem' }}><strong>Payment:</strong> {selected.paymentResult?.method || 'COD'} — {selected.paymentResult?.status}</p>
            <p style={{ fontSize:'0.8125rem', marginBottom:'1rem' }}><strong>Status:</strong> <span className={`badge ${statusColors[selected.orderStatus]}`}>{selected.orderStatus}</span></p>

            <h4 style={{ fontSize:'0.8125rem', fontWeight:600, marginBottom:'0.5rem', color:'var(--color-text-muted)' }}>Items</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1rem' }}>
              {selected.orderItems?.map((item, i) => (
                <div key={i} style={{ display:'flex', gap:'0.5rem', alignItems:'center', fontSize:'0.8125rem' }}>
                  <img src={item.image || item.product?.images?.[0]} alt="" style={{ width:36, height:36, borderRadius:4, objectFit:'cover' }} />
                  <div style={{ flex:1 }}><p style={{ fontWeight:500 }}>{(item.title || item.product?.title || 'Product').slice(0,30)}</p><p style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>{item.quantity} x ${item.unitPrice || item.price}</p></div>
                </div>
              ))}
            </div>

            <div style={{ borderTop:'1px solid var(--color-border)', paddingTop:'0.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', marginBottom:'0.25rem' }}><span>Subtotal</span><span>${selected.pricing?.subtotal}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', marginBottom:'0.25rem' }}><span>Shipping</span><span>${selected.pricing?.shipping}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8125rem', marginBottom:'0.25rem' }}><span>Tax</span><span>${selected.pricing?.tax}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9375rem', fontWeight:700, marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid var(--color-border)' }}><span>Total</span><span>${selected.pricing?.total}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
