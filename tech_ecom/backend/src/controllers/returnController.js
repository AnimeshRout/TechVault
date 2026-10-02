// RETURN CONTROLLER — Returns/Refunds Flow
import Stripe from 'stripe';
import Return from '../models/Return.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAudit } from '../middleware/auditLogger.js';
import { sendEmail, orderRefundEmail } from '../services/emailService.js';

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// ─── USER: Request Return ────────────────────────────────────────────────────
export const requestReturn = catchAsync(async (req, res, next) => {
  const { orderId, reason, description, items } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found.', 404));

  // Verify ownership
  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized.', 403));
  }

  // Must be delivered
  if (order.orderStatus !== 'Delivered') {
    return next(new AppError('Returns are only accepted for delivered orders.', 400));
  }

  // Within 30 days of delivery
  const daysSinceDelivery = (Date.now() - order.deliveredAt) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 30) {
    return next(new AppError('Return window (30 days) has expired.', 400));
  }

  // Check for existing return
  const existingReturn = await Return.findOne({ order: orderId, status: { $ne: 'rejected' } });
  if (existingReturn) {
    return next(new AppError('A return request already exists for this order.', 400));
  }

  // Calculate refund amount from items
  const returnItems = items || order.orderItems.map((i) => ({
    product: i.product,
    title: i.title,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));

  const refundAmount = returnItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const returnRequest = await Return.create({
    order: orderId,
    user: req.user._id,
    reason,
    description: description || '',
    items: returnItems,
    refundAmount,
  });

  res.status(201).json({
    status: 'success',
    message: 'Return request submitted.',
    data: { return: returnRequest },
  });
});

// ─── USER: Get My Returns ────────────────────────────────────────────────────
export const getMyReturns = catchAsync(async (req, res) => {
  const returns = await Return.find({ user: req.user._id })
    .sort('-createdAt')
    .populate('order', 'orderItems pricing orderStatus');

  res.status(200).json({ status: 'success', results: returns.length, data: { returns } });
});

// ─── ADMIN: Get All Returns ──────────────────────────────────────────────────
export const getAllReturns = catchAsync(async (req, res) => {
  const returns = await Return.find()
    .sort('-createdAt')
    .populate('user', 'name email')
    .populate('order', 'orderItems pricing');

  res.status(200).json({ status: 'success', results: returns.length, data: { returns } });
});

// ─── ADMIN: Process Return (Approve/Reject) ──────────────────────────────────
export const processReturn = catchAsync(async (req, res, next) => {
  const { status, adminNote } = req.body;
  const returnReq = await Return.findById(req.params.id).populate('order');

  if (!returnReq) return next(new AppError('Return request not found.', 404));

  if (returnReq.status !== 'requested') {
    return next(new AppError('This return has already been processed.', 400));
  }

  if (status === 'rejected') {
    returnReq.status = 'rejected';
    returnReq.adminNote = adminNote || '';
    returnReq.processedAt = new Date();
    returnReq.processedBy = req.user._id;
    await returnReq.save();

    await logAudit({
      action: 'STATUS_CHANGE',
      resource: 'order',
      resourceId: returnReq.order._id,
      user: req.user,
      description: `Return rejected for order ${returnReq.order._id}`,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Return rejected.',
      data: { return: returnReq },
    });
  }

  if (status === 'approved') {
    returnReq.status = 'approved';
    returnReq.adminNote = adminNote || '';
    returnReq.processedAt = new Date();
    returnReq.processedBy = req.user._id;

    // Process Stripe refund if payment was via Stripe
    const order = returnReq.order;
    if (order.paymentResult?.transactionId && order.paymentResult?.status === 'completed') {
      try {
        const refund = await getStripe().refunds.create({
          payment_intent: order.paymentResult.transactionId,
          amount: Math.round(returnReq.refundAmount * 100), // cents
        });
        returnReq.stripeRefundId = refund.id;
        returnReq.status = 'refunded';

        // Update order payment status
        order.paymentResult.status = 'refunded';
        await order.save();
      } catch (err) {
        return next(new AppError(`Stripe refund failed: ${err.message}`, 500));
      }
    } else {
      returnReq.status = 'refunded'; // Mark as refunded even without Stripe
    }

    // Restock items
    for (const item of returnReq.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    await returnReq.save();

    // Send refund email
    const user = await User.findById(returnReq.user);
    if (user) {
      await sendEmail({
        to: user.email,
        subject: `TechVault — Refund Processed ($${returnReq.refundAmount.toFixed(2)})`,
        html: orderRefundEmail(order, user, returnReq.refundAmount),
      });
    }

    await logAudit({
      action: 'REFUND',
      resource: 'order',
      resourceId: order._id,
      user: req.user,
      description: `Refund of $${returnReq.refundAmount} processed for order ${order._id}`,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Return approved and refund processed.',
      data: { return: returnReq },
    });
  }

  return next(new AppError('Invalid status. Use "approved" or "rejected".', 400));
});
