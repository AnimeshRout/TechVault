/**
 * ============================================================================
 * PAYMENT CONTROLLER (Stripe)
 * ============================================================================
 * Handles Stripe Checkout Session creation, payment verification, and refunds.
 * Uses Stripe Checkout (hosted page) for card payments.
 * Sends order confirmation and payment emails.
 * ============================================================================
 */
import Stripe from 'stripe';
import Order from '../models/Order.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendEmail, orderConfirmationEmail } from '../services/emailService.js';

// Lazy-initialize Stripe to ensure env vars are loaded
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ─── CREATE STRIPE CHECKOUT SESSION ──────────────────────────────────────────
export const createCheckoutSession = catchAsync(async (req, res, next) => {
  const orderId = req.params.id || req.body.orderId;

  const order = await Order.findById(orderId).populate('orderItems.product', 'title images');
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Verify order belongs to user
  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to pay for this order.', 403));
  }

  // Verify order isn't already paid
  if (order.paymentResult.status === 'completed') {
    return next(new AppError('This order has already been paid.', 400));
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5175';

  // Build line items from the order
  const line_items = order.orderItems.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.title || 'Product',
        images: item.image ? [item.image] : [],
      },
      unit_amount: Math.round((item.unitPrice || 0) * 100), // in cents
    },
    quantity: item.quantity,
  }));

  // Add shipping as a line item if > 0
  if (order.pricing.shipping > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(order.pricing.shipping * 100),
      },
      quantity: 1,
    });
  }

  // Add tax as a line item if > 0
  if (order.pricing.tax > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tax' },
        unit_amount: Math.round(order.pricing.tax * 100),
      },
      quantity: 1,
    });
  }

  // Create Stripe Checkout Session
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    },
    success_url: `${clientUrl}/orders?payment=success&orderId=${order._id}`,
    cancel_url: `${clientUrl}/orders?payment=cancelled&orderId=${order._id}`,
    customer_email: req.user.email,
  });

  // Store the session ID on the order for verification later
  order.paymentResult.transactionId = session.id;
  order.paymentResult.method = 'stripe';
  await order.save();

  res.status(200).json({
    status: 'success',
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
});

// ─── VERIFY CHECKOUT SESSION (called after redirect back) ────────────────────
export const verifyCheckoutSession = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  if (order.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized.', 403));
  }

  // Already confirmed
  if (order.paymentResult.status === 'completed') {
    return res.status(200).json({
      status: 'success',
      data: { order, paymentStatus: 'completed' },
    });
  }

  // Retrieve the session from Stripe
  const sessionId = order.paymentResult.transactionId;
  if (!sessionId) {
    return next(new AppError('No payment session found for this order.', 400));
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    order.paymentResult.status = 'completed';
    order.paymentResult.paidAt = new Date();
    // Store the Stripe payment intent for refunds later
    if (session.payment_intent) {
      order.paymentResult.stripePaymentIntentId = session.payment_intent;
    }
    order.transitionStatus('Processing', 'Payment confirmed via Stripe Checkout');
    await order.save();

    // Send payment confirmation email
    try {
      const user = await User.findById(order.user);
      if (user?.email) {
        const html = orderConfirmationEmail(order, user);
        await sendEmail({
          to: user.email,
          subject: `✅ Payment Confirmed — Order #${order._id.toString().slice(-8).toUpperCase()}`,
          html,
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-blocking):', emailErr.message);
    }

    return res.status(200).json({
      status: 'success',
      data: { order, paymentStatus: 'completed' },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { order, paymentStatus: session.payment_status },
  });
});

// ─── REFUND (used when cancelling a paid order) ──────────────────────────────
export async function refundOrder(order) {
  if (order.paymentResult?.status !== 'completed') {
    return { refunded: false, reason: 'Order was not paid' };
  }

  const sessionId = order.paymentResult.transactionId;
  if (!sessionId) {
    return { refunded: false, reason: 'No payment session found' };
  }

  try {
    // Retrieve the checkout session to get the payment intent
    let paymentIntentId = order.paymentResult.stripePaymentIntentId;
    if (!paymentIntentId) {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paymentIntentId = session.payment_intent;
    }

    if (!paymentIntentId) {
      return { refunded: false, reason: 'No payment intent found for refund' };
    }

    // Create refund
    const refund = await getStripe().refunds.create({
      payment_intent: paymentIntentId,
    });

    return {
      refunded: true,
      refundId: refund.id,
      amount: refund.amount / 100, // convert back from cents
      status: refund.status,
    };
  } catch (err) {
    console.error('Stripe Refund Error:', err.message);
    return { refunded: false, reason: err.message };
  }
}

// ─── GET STRIPE PUBLISHABLE KEY ──────────────────────────────────────────────
export const getStripeConfig = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
  });
});
