// EXPORT SERVICE — CSV exports for admin
import Order from '../models/Order.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';

// ─── Export Orders CSV ───────────────────────────────────────────────────────
export const exportOrdersCSV = catchAsync(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .sort('-createdAt')
    .lean();

  const headers = ['Order ID', 'Customer', 'Email', 'Status', 'Payment', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Items', 'Date'];
  const rows = orders.map((o) => [
    o._id,
    `"${o.user?.name || 'Deleted User'}"`,
    o.user?.email || '',
    o.orderStatus,
    o.paymentResult?.status || 'pending',
    o.pricing?.subtotal?.toFixed(2),
    o.pricing?.tax?.toFixed(2),
    o.pricing?.shippingCost?.toFixed(2),
    o.pricing?.total?.toFixed(2),
    o.orderItems?.length || 0,
    new Date(o.createdAt).toISOString(),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=techvault-orders.csv');
  res.send(csv);
});

// ─── Export Users CSV ────────────────────────────────────────────────────────
export const exportUsersCSV = catchAsync(async (req, res) => {
  const users = await User.find().lean();

  const headers = ['ID', 'Name', 'Email', 'Role', 'Active', 'Email Verified', 'Registered'];
  const rows = users.map((u) => [
    u._id,
    `"${u.name}"`,
    u.email,
    u.role,
    u.isActive,
    u.isEmailVerified || false,
    new Date(u.createdAt).toISOString(),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=techvault-users.csv');
  res.send(csv);
});
