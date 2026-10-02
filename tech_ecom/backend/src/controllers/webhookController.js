// WEBHOOK CONTROLLER — Stripe Webhook Handler
import Stripe from 'stripe';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendEmail, orderConfirmationEmail } from '../services/emailService.js';
import { logAudit } from '../middleware/auditLogger.js';

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret) {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Development fallback — parse raw JSON (no signature verification)
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ─── Handle events ──────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (!orderId) {
          console.warn('⚠️ payment_intent.succeeded without orderId in metadata');
          break;
        }

        const order = await Order.findById(orderId);
        if (!order) {
          console.warn(`⚠️ Order ${orderId} not found for payment_intent.succeeded`);
          break;
        }

        // Idempotency: skip if already processed
        if (order.paymentResult.status === 'completed') {
          console.log(`ℹ️ Order ${orderId} already processed — skipping`);
          break;
        }

        order.paymentResult.status = 'completed';
        order.paymentResult.transactionId = paymentIntent.id;
        order.paymentResult.paidAt = new Date();
        order.transitionStatus('Processing', 'Payment confirmed via Stripe webhook');
        await order.save();

        // Send order confirmation email
        const user = await User.findById(order.user);
        if (user) {
          await sendEmail({
            to: user.email,
            subject: `TechVault — Order Confirmed #${orderId.toString().slice(-8).toUpperCase()}`,
            html: orderConfirmationEmail(order, user),
          });
        }

        console.log(`✅ Order ${orderId} — payment succeeded`);

        await logAudit({
          action: 'STATUS_CHANGE',
          resource: 'order',
          resourceId: orderId,
          description: `Payment confirmed via Stripe webhook (PI: ${paymentIntent.id})`,
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) break;

        // Don't overwrite if already completed
        if (order.paymentResult.status === 'completed') break;

        order.paymentResult.status = 'failed';
        order.paymentResult.transactionId = paymentIntent.id;
        await order.save();

        console.log(`❌ Order ${orderId} — payment failed`);

        await logAudit({
          action: 'STATUS_CHANGE',
          resource: 'order',
          resourceId: orderId,
          description: `Payment failed via Stripe webhook (PI: ${paymentIntent.id})`,
        });

        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error('❌ Webhook handler error:', err.message);
    // Still return 200 to prevent Stripe retries for processing errors
  }

  // Always acknowledge receipt
  res.status(200).json({ received: true });
};
