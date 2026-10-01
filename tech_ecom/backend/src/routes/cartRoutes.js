/**
 * Cart Routes — All require authentication
 * GET    /api/cart          — Get user's cart
 * POST   /api/cart          — Add item to cart
 * PUT    /api/cart/:itemId  — Update item quantity
 * DELETE /api/cart/:itemId  — Remove item from cart
 * DELETE /api/cart          — Clear entire cart
 */
import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:itemId', updateCartItem);
router.delete('/clear', clearCart);      // Must be before /:itemId
router.delete('/:itemId', removeFromCart);

export default router;
