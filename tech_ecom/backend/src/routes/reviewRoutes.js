/**
 * Review Routes
 * GET    /api/reviews/product/:productId — Get reviews for a product (public)
 * POST   /api/reviews                    — Create review (authenticated)
 * PUT    /api/reviews/:id                — Update review (owner only)
 * DELETE /api/reviews/:id                — Delete review (owner or admin)
 */
import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { reviewLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { createReviewSchema, updateReviewSchema } from '../validators/reviewValidator.js';

const router = express.Router();

// Public
router.get('/product/:productId', getProductReviews);

// Protected
router.post('/', protect, reviewLimiter, validate(createReviewSchema), createReview);
router.put('/:id', protect, validate(updateReviewSchema), updateReview);
router.delete('/:id', protect, deleteReview);

export default router;
