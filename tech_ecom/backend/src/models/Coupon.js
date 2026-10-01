/**
 * ============================================================================
 * COUPON MODEL
 * ============================================================================
 * Supports percentage and fixed-amount discounts with:
 * - Minimum order amount threshold
 * - Maximum usage cap (global + per-user)
 * - Expiry date
 * - Active/inactive toggle
 * ============================================================================
 */
import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: 200,
    },
    type: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Coupon type must be percentage or fixed',
      },
      required: true,
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null, // Only for percentage — caps the dollar discount
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUses: {
      type: Number,
      default: null, // null = unlimited
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    maxUsesPerUser: {
      type: Number,
      default: 1,
      min: 1,
    },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ expiresAt: 1 });
CouponSchema.index({ isActive: 1 });

/**
 * Validate coupon for a given user and order subtotal
 * @returns {{ valid: boolean, discount: number, message: string }}
 */
CouponSchema.methods.validateForOrder = function (userId, subtotal) {
  // Check active
  if (!this.isActive) {
    return { valid: false, discount: 0, message: 'This coupon is no longer active.' };
  }

  // Check expiry
  if (this.expiresAt < new Date()) {
    return { valid: false, discount: 0, message: 'This coupon has expired.' };
  }

  // Check global usage cap
  if (this.maxUses && this.usedCount >= this.maxUses) {
    return { valid: false, discount: 0, message: 'This coupon has reached its usage limit.' };
  }

  // Check per-user usage
  if (userId) {
    const userUses = this.usedBy.filter(
      (u) => u.user.toString() === userId.toString()
    ).length;
    if (userUses >= this.maxUsesPerUser) {
      return { valid: false, discount: 0, message: 'You have already used this coupon.' };
    }
  }

  // Check minimum order
  if (subtotal < this.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order amount is $${this.minOrderAmount.toFixed(2)}.`,
    };
  }

  // Calculate discount
  let discount;
  if (this.type === 'percentage') {
    discount = (subtotal * this.value) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.value;
  }

  // Discount can't exceed subtotal
  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    discount: Math.round(discount * 100) / 100,
    message: `Coupon applied! You saved $${discount.toFixed(2)}.`,
  };
};

/**
 * Mark coupon as used by a user
 */
CouponSchema.methods.markUsed = async function (userId) {
  this.usedCount += 1;
  this.usedBy.push({ user: userId, usedAt: new Date() });
  await this.save();
};

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
export default Coupon;
