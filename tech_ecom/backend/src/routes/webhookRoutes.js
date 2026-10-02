// WEBHOOK ROUTES
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Stripe webhook — raw body required
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
