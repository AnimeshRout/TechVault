/**
 * ============================================================================
 * COUPON CONTROLLER
 * ============================================================================
 * Admin: CRUD coupons
 * User: Validate coupon code
 * ============================================================================
 */
import Coupon from '../models/Coupon.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { logAudit } from '../middleware/auditLogger.js';

// ─── ADMIN: Create Coupon ────────────────────────────────────────────────────
export const createCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.create(req.body);

  await logAudit({
    action: 'CREATE',
    resource: 'coupon',
    resourceId: coupon._id,
    user: req.user,
    description: `Created coupon: ${coupon.code}`,
    req,
  });

  res.status(201).json({ status: 'success', data: { coupon } });
});

// ─── ADMIN: Get All Coupons ──────────────────────────────────────────────────
export const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt');
  res.status(200).json({ status: 'success', results: coupons.length, data: { coupons } });
});

// ─── ADMIN: Get Single Coupon ────────────────────────────────────────────────
export const getCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return next(new AppError('Coupon not found.', 404));
  res.status(200).json({ status: 'success', data: { coupon } });
});

// ─── ADMIN: Update Coupon ────────────────────────────────────────────────────
export const updateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) return next(new AppError('Coupon not found.', 404));

  await logAudit({
    action: 'UPDATE',
    resource: 'coupon',
    resourceId: coupon._id,
    user: req.user,
    description: `Updated coupon: ${coupon.code}`,
    changes: req.body,
    req,
  });

  res.status(200).json({ status: 'success', data: { coupon } });
});

// ─── ADMIN: Delete Coupon ────────────────────────────────────────────────────
export const deleteCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new AppError('Coupon not found.', 404));

  await logAudit({
    action: 'DELETE',
    resource: 'coupon',
    resourceId: req.params.id,
    user: req.user,
    description: `Deleted coupon: ${coupon.code}`,
    req,
  });

  res.status(200).json({ status: 'success', message: 'Coupon deleted.' });
});

// ─── USER: Validate Coupon ───────────────────────────────────────────────────
export const validateCoupon = catchAsync(async (req, res, next) => {
  const { code, subtotal } = req.body;

  if (!code) return next(new AppError('Please provide a coupon code.', 400));

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) return next(new AppError('Invalid coupon code.', 404));

  const userId = req.user?._id || null;
  const result = coupon.validateForOrder(userId, subtotal || 0);

  if (!result.valid) {
    return res.status(400).json({ status: 'fail', message: result.message });
  }

  res.status(200).json({
    status: 'success',
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: result.discount,
      message: result.message,
    },
  });
});
