/**
 * Order Routes — All require authentication
 * POST   /api/orders                         — Place new order
 * GET    /api/orders/my                      — Get user's order history
 * GET    /api/orders/:id                     — Get single order
 * PUT    /api/orders/:id/cancel              — Cancel order (+ auto refund if paid)
 * GET    /api/orders/:id/invoice             — Download invoice PDF
 * POST   /api/orders/:id/checkout-session    — Create Stripe Checkout Session
 * GET    /api/orders/:id/verify-payment      — Verify Stripe payment after redirect
 */
import express from 'express';
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getOrderInvoice,
} from '../controllers/orderController.js';
import {
  createCheckoutSession,
  verifyCheckoutSession,
  getStripeConfig,
} from '../controllers/paymentController.js';
import { exportOrdersCSV, exportUsersCSV } from '../services/exportService.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { checkoutLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { createOrderSchema } from '../validators/orderValidator.js';

const router = express.Router();

// Stripe config (public)
router.get('/stripe-config', getStripeConfig);

// All order routes require authentication
router.use(protect);

router.post('/', checkoutLimiter, validate(createOrderSchema), placeOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.get('/:id/invoice', getOrderInvoice);

// Payment routes — Stripe Checkout Session
router.post('/:id/checkout-session', checkoutLimiter, createCheckoutSession);
router.get('/:id/verify-payment', verifyCheckoutSession);

// Admin exports
router.get('/admin/export/orders', authorize('admin'), exportOrdersCSV);
router.get('/admin/export/users', authorize('admin'), exportUsersCSV);

export default router;
