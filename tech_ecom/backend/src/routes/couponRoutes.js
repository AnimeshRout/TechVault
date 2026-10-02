// COUPON ROUTES
import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// Public / authenticated: validate coupon
router.post('/validate', protect, validateCoupon);

// Admin-only CRUD
router.use(protect, authorize('admin'));
router.route('/').get(getAllCoupons).post(createCoupon);
router.route('/:id').get(getCoupon).put(updateCoupon).delete(deleteCoupon);

export default router;
