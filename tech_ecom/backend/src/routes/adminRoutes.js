/**
 * Admin Routes — All require admin role
 */
import express from 'express';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';
import {
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
} from '../controllers/orderController.js';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  batchUpdateStock,
  getAllProducts,
} from '../controllers/productController.js';
import validate from '../middleware/validate.js';
import { updateOrderStatusSchema } from '../validators/orderValidator.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { logAudit } from '../middleware/auditLogger.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Product management
router.get('/products', getAllProducts);
router.post('/products', validate(createProductSchema), createProduct);
router.put('/products/:id', validate(updateProductSchema), updateProduct);
router.delete('/products/:id', deleteProduct);
router.put('/products/batch/stock', batchUpdateStock);

// Order management
router.get('/orders', getAllOrders);
router.put('/orders/:id', validate(updateOrderStatusSchema), updateOrderStatus);

// User management
router.get('/users', catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select('-password -refreshToken')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments();

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
    },
    data: { users },
  });
}));

router.put('/users/:id', catchAsync(async (req, res, next) => {
  const { role, isActive } = req.body;
  const updateData = {};
  if (role) updateData.role = role;
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken');

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // Audit log for role/status changes
  await logAudit({
    action: role ? 'ROLE_CHANGE' : 'STATUS_CHANGE',
    resource: 'user',
    resourceId: user._id,
    user: req.user,
    description: `Updated user ${user.email}: ${JSON.stringify(updateData)}`,
    changes: updateData,
    req,
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: { user },
  });
}));

// ─── Audit Logs ──────────────────────────────────────────────────────────────
router.get('/audit-logs', catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resource = req.query.resource;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
    },
    data: { logs },
  });
}));

export default router;

