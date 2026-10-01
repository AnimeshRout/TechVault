/**
 * ============================================================================
 * ORDER CONTROLLER
 * ============================================================================
 * Order placement uses MongoDB ACID Transactions to ensure atomicity:
 *   1. Validate all items have sufficient stock
 *   2. Decrement stock for all items (atomic $inc with $gte guard)
 *   3. Create order with product snapshots
 *   4. Clear user's cart
 * If ANY step fails → entire transaction rolls back cleanly.
 *
 * This prevents the critical race condition where multiple users try to
 * buy the last unit simultaneously.
 * ============================================================================
 */
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { refundOrder } from './paymentController.js';
import { sendEmail, orderConfirmationEmail, orderRefundEmail } from '../services/emailService.js';

// ─── PLACE ORDER (MongoDB Transaction) ───────────────────────────────────────
export const placeOrder = catchAsync(async (req, res, next) => {
  const { shippingAddress, paymentMethod = 'stripe' } = req.body;

  // 1. Get user's cart with populated products
  const cart = await Cart.findOne({ user: req.user._id })
    .populate('items.product', 'title slug images price discountPrice brand stock');

  if (!cart || cart.items.length === 0) {
    return next(new AppError('Your cart is empty. Add items before placing an order.', 400));
  }

  // ─── START MONGODB TRANSACTION ─────────────────────────────────────
  const session = await mongoose.startSession();

  try {
    // withTransaction handles commit/abort automatically
    const order = await session.withTransaction(async () => {
      // 2. Build order items + validate & decrement stock atomically
      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = cartItem.product;

        if (!product) {
          throw new AppError(`Product no longer exists. Please update your cart.`, 404);
        }

        // ATOMIC stock decrement with guard (THE CONCURRENCY-SAFE OPERATION)
        const updatedProduct = await Product.decrementStock(
          product._id,
          cartItem.quantity,
          session
        );

        if (!updatedProduct) {
          // Stock insufficient — transaction will auto-rollback
          throw new AppError(
            `Insufficient stock for "${product.title}". Only ${product.stock} units available, but you requested ${cartItem.quantity}.`,
            409 // Conflict
          );
        }

        // Build product snapshot for order (frozen at purchase time)
        const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
        orderItems.push({
          product: product._id,
          title: product.title,
          slug: product.slug,
          image: product.images[0],
          brand: product.brand,
          variant: cartItem.variant,
          quantity: cartItem.quantity,
          unitPrice,
        });

        subtotal += unitPrice * cartItem.quantity;
      }

      // 3. Calculate pricing
      const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
      const shippingCost = subtotal >= 500 ? 0 : 29.99;     // Free shipping over $500
      const total = Math.round((subtotal + tax + shippingCost) * 100) / 100;

      // 4. Create order document within the transaction
      const [newOrder] = await Order.create(
        [
          {
            user: req.user._id,
            orderItems,
            shippingAddress,
            paymentResult: {
              status: paymentMethod === 'cod' ? 'pending' : 'pending',
              method: paymentMethod,
            },
            pricing: {
              subtotal,
              tax,
              shippingCost,
              total,
            },
            orderStatus: 'Placed',
          },
        ],
        { session }
      );

      // 5. Clear user's cart within the transaction
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [] } },
        { session }
      );

      return newOrder;
    });

    // Transaction committed successfully

    // Send order confirmation email (non-blocking)
    try {
      const html = orderConfirmationEmail(order, req.user);
      await sendEmail({
        to: req.user.email,
        subject: `📦 Order Confirmed — #${order._id.toString().slice(-8).toUpperCase()}`,
        html,
      });
    } catch (emailErr) {
      console.error('Order confirmation email failed (non-blocking):', emailErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: { order },
    });
  } catch (error) {
    // Transaction auto-rolled back by withTransaction
    if (error.isOperational) {
      return next(error);
    }
    console.error('Order Transaction Error:', error);
    return next(new AppError('Order placement failed. Please try again.', 500));
  } finally {
    session.endSession();
  }
});

// ─── GET MY ORDERS ───────────────────────────────────────────────────────────
export const getMyOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.user._id })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments({ user: req.user._id });

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
    },
    data: { orders },
  });
});

// ─── GET SINGLE ORDER ────────────────────────────────────────────────────────
export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Users can only view their own orders (admin can view any)
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to view this order.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

// ─── UPDATE ORDER STATUS (Admin Only) ────────────────────────────────────────
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderStatus, note, trackingNumber } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Use the model's transitionStatus method (validates the flow)
  try {
    order.transitionStatus(orderStatus, note || '');
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  // Update tracking number if provided
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }

  await order.save();

  res.status(200).json({
    status: 'success',
    message: `Order status updated to "${orderStatus}"`,
    data: { order },
  });
});

// ─── CANCEL ORDER (Restore stock + Refund if paid + DELETE from DB) ──────────
export const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Users can only cancel their own orders
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to cancel this order.', 403));
  }

  if (!order.isCancellable) {
    return next(new AppError('This order cannot be cancelled.', 400));
  }

  // If the order was paid, process refund via Stripe
  let refundResult = { refunded: false };
  if (order.paymentResult?.status === 'completed' && order.paymentResult?.method === 'stripe') {
    refundResult = await refundOrder(order);
  }

  // Start transaction — restore stock + delete order from DB
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Restore stock for all items
      for (const item of order.orderItems) {
        await Product.incrementStock(item.product, item.quantity, session);
      }

      // Delete the order from database entirely
      await Order.findByIdAndDelete(order._id, { session });
    });

    // Send cancellation/refund email
    try {
      const user = await User.findById(order.user);
      if (user?.email) {
        if (refundResult.refunded) {
          const html = orderRefundEmail(order, user, refundResult.amount);
          await sendEmail({
            to: user.email,
            subject: `💰 Refund Processed — Order #${order._id.toString().slice(-8).toUpperCase()}`,
            html,
          });
        } else {
          // Simple cancellation email (no refund)
          const html = orderRefundEmail(order, user, 0);
          await sendEmail({
            to: user.email,
            subject: `❌ Order Cancelled — Order #${order._id.toString().slice(-8).toUpperCase()}`,
            html,
          });
        }
      }
    } catch (emailErr) {
      console.error('Cancel email failed (non-blocking):', emailErr.message);
    }

    const message = refundResult.refunded
      ? `Order cancelled. Refund of $${refundResult.amount?.toFixed(2)} has been initiated to your card.`
      : 'Order cancelled and deleted successfully. Stock has been restored.';

    res.status(200).json({
      status: 'success',
      message,
      data: { refunded: refundResult.refunded, refundAmount: refundResult.amount || 0 },
    });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    return next(new AppError('Failed to cancel order. Please try again.', 500));
  } finally {
    session.endSession();
  }
});

// ─── GET ALL ORDERS (Admin Only) ─────────────────────────────────────────────
export const getAllOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.orderStatus = req.query.status;

  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
    },
    data: { orders },
  });
});

// ─── DASHBOARD ANALYTICS (Admin Only) ────────────────────────────────────────
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalOrders,
    totalRevenue,
    ordersByStatus,
    recentOrders,
    monthlySales,
  ] = await Promise.all([
    // Total orders count
    Order.countDocuments(),

    // Total revenue (only completed payments)
    Order.aggregate([
      { $match: { 'paymentResult.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),

    // Orders grouped by status
    Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),

    // Last 5 orders
    Order.find()
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(5),

    // Monthly sales for the last 12 months
    Order.aggregate([
      {
        $match: {
          'paymentResult.status': 'completed',
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  // Low stock products
  const lowStockProducts = await Product.find({ stock: { $lte: 5 } })
    .select('title brand stock images')
    .sort('stock')
    .limit(10);

  // Total active users
  const User = mongoose.model('User');
  const totalUsers = await User.countDocuments({ isActive: true });

  res.status(200).json({
    status: 'success',
    data: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalUsers,
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((s) => [s._id, s.count])
      ),
      lowStockProducts,
      recentOrders,
      monthlySales: monthlySales.map((m) => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
        revenue: m.revenue,
        orders: m.orders,
      })),
    },
  });
});

// ─── GET ORDER INVOICE (PDF Download) ────────────────────────────────────────
import { generateInvoicePDF } from '../services/invoiceService.js';

export const getOrderInvoice = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Verify ownership or admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to access this invoice.', 403));
  }

  const user = await User.findById(order.user);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  generateInvoicePDF(order, user, res);
});

