/**
 * Return Routes
 */
import express from 'express';
import { requestReturn, getMyReturns, getAllReturns, processReturn } from '../controllers/returnController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// User routes
router.post('/', protect, requestReturn);
router.get('/my', protect, getMyReturns);

// Admin routes
router.get('/', protect, authorize('admin'), getAllReturns);
router.put('/:id', protect, authorize('admin'), processReturn);

export default router;
