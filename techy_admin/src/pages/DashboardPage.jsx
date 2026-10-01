import { useEffect, useState } from 'react';
import { HiOutlineCurrencyDollar, HiOutlineShoppingCart, HiOutlineCube, HiOutlineUsers } from 'react-icons/hi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';

const COLORS = ['#6366f1', '#f59e0b', '#06b6d4', '#10b981', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard').catch(() => ({ data: { data: {} } })),
      api.get('/admin/orders?limit=5&sort=-createdAt').catch(() => ({ data: { data: { orders: [] } } })),
    ]).then(([dashRes, ordersRes]) => {
      setStats(dashRes.data.data);
      setOrders(ordersRes.data.data.orders || ordersRes.data.data.recentOrders || []);
      setLoading(false);
    });
  }, []);

  const kpis = stats ? [
    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toLocaleString()}`, icon: HiOutlineCurrencyDollar, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: HiOutlineShoppingCart, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Total Products', value: stats.totalProducts || 0, icon: HiOutlineCube, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Total Users', value: stats.totalUsers || 0, icon: HiOutlineUsers, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ] : [];

  // Convert ordersByStatus object {Placed: 3, Shipped: 5} into array [{name, value}]
  const rawStatus = stats?.ordersByStatus;
  const statusData = Array.isArray(rawStatus) ? rawStatus
    : rawStatus && typeof rawStatus === 'object' && Object.keys(rawStatus).length > 0
      ? Object.entries(rawStatus).map(([name, value]) => ({ name, value }))
      : [{ name: 'No Data', value: 1 }];

  // Revenue chart — use monthlySales or monthlyRevenue from API, or fallback
  const rawRevenue = stats?.monthlySales || stats?.monthlyRevenue;
  const revenueData = Array.isArray(rawRevenue) && rawRevenue.length > 0 ? rawRevenue : [
    { month: 'Jan', revenue: 4200 }, { month: 'Feb', revenue: 5800 }, { month: 'Mar', revenue: 7200 },
    { month: 'Apr', revenue: 6100 }, { month: 'May', revenue: 9500 }, { month: 'Jun', revenue: 8700 },
  ];

  const statusColors = { Placed: 'badge-primary', Processing: 'badge-warning', Shipped: 'badge-primary', Delivered: 'badge-success', Cancelled: 'badge-error' };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Overview of your store performance</p></div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card card">
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}><kpi.icon size={22} /></div>
            <div><p className="kpi-value">{kpi.value}</p><p className="kpi-label">{kpi.label}</p></div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-card card">
          <h3>Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}><defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.8125rem' }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Orders by Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
              {statusData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
            </Pie><Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Orders</h3>
        {orders.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No orders yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td style={{ fontWeight: 600 }}>#{o._id.slice(-8).toUpperCase()}</td>
                  <td>{o.user?.name || 'N/A'}</td>
                  <td>${o.pricing?.total?.toLocaleString()}</td>
                  <td><span className={`badge ${statusColors[o.orderStatus] || 'badge-primary'}`}>{o.orderStatus}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
