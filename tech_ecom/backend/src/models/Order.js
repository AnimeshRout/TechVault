/**
 * ============================================================================
 * ORDER MODEL
 * ============================================================================
 * Fields: user (ref), orderItems[] (product snapshot), shippingAddress,
 *         paymentResult { status, transactionId, method }, pricing
 *         { subtotal, tax, shipping, total }, orderStatus (enum with timeline),
 *         statusHistory[] with timestamps
 *
 * Concurrency & Transactions:
 *   - Order placement MUST be wrapped in a MongoDB ACID Transaction:
 *     1. Validate stock for all items (atomic $gte check)
 *     2. Decrement stock for all items (atomic $inc)
 *     3. Create order document
 *     4. Clear user's cart
 *     If ANY step fails → entire transaction rolls back
 *
 * Design:
 *   - orderItems contain a SNAPSHOT of the product at purchase time
 *     (title, price, image) so the order history remains accurate
 *     even if the product is later modified or deleted
 *   - statusHistory tracks all status transitions with timestamps
 * ============================================================================
 */
import mongoose from 'mongoose';

// Snapshot of a product at the time of purchase
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true },
    slug: { type: String },
    image: { type: String, required: true },
    brand: { type: String },
    variant: { type: String, default: null },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: { type: String, default: '' }, // e.g., "Tracking: ABC123XYZ"
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: function (arr) {
          return arr.length >= 1;
        },
        message: 'Order must contain at least one item',
      },
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentResult: {
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: { type: String, default: '' },
      stripePaymentIntentId: { type: String, default: '' },
      method: {
        type: String,
        enum: ['stripe', 'razorpay', 'cod'],
        default: 'stripe',
      },
      paidAt: { type: Date },
      refundedAt: { type: Date },
      refundId: { type: String, default: '' },
    },
    // Pricing breakdown (calculated at order placement, never changes)
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      tax: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      shippingCost: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        message: 'Invalid order status',
      },
      default: 'Placed',
    },
    // Full audit trail of status changes
    statusHistory: [statusHistorySchema],

    // Delivery tracking
    trackingNumber: { type: String, default: '' },
    carrier: {
      type: String,
      enum: ['', 'fedex', 'ups', 'usps', 'dhl', 'other'],
      default: '',
    },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },

    // Coupon
    couponCode: { type: String, default: '' },

    // Idempotency key for payments
    idempotencyKey: { type: String, default: '' },

    // Notes
    customerNote: { type: String, maxlength: 500, default: '' },
    adminNote: { type: String, maxlength: 500, default: '', select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
OrderSchema.index({ user: 1, createdAt: -1 }); // User's order history (newest first)
OrderSchema.index({ orderStatus: 1 });           // Admin: filter by status
OrderSchema.index({ 'paymentResult.status': 1 }); // Payment status queries
OrderSchema.index({ createdAt: -1 });             // Admin: recent orders

// ─── PRE-SAVE HOOK: Initialize status history ────────────────────────────────
OrderSchema.pre('save', function (next) {
  // On creation, add initial "Placed" to status history
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: 'Placed',
      timestamp: new Date(),
      note: 'Order placed successfully',
    });
  }
  next();
});

// ─── INSTANCE METHODS ────────────────────────────────────────────────────────

/**
 * Transition order to a new status with audit trail
 * Validates the transition is logical (can't go backwards except to Cancelled)
 *
 * @param {string} newStatus
 * @param {string} note - Optional note for the status change
 */
OrderSchema.methods.transitionStatus = function (newStatus, note = '') {
  const statusFlow = ['Placed', 'Processing', 'Shipped', 'Delivered'];
  const currentIndex = statusFlow.indexOf(this.orderStatus);
  const newIndex = statusFlow.indexOf(newStatus);

  // Allow cancellation from any non-delivered status
  if (newStatus === 'Cancelled') {
    if (this.orderStatus === 'Delivered') {
      throw new Error('Cannot cancel a delivered order');
    }
    this.orderStatus = 'Cancelled';
    this.statusHistory.push({ status: 'Cancelled', timestamp: new Date(), note });
    return;
  }

  // Validate forward progression
  if (newIndex <= currentIndex) {
    throw new Error(
      `Cannot transition from "${this.orderStatus}" to "${newStatus}". Orders can only move forward.`
    );
  }

  this.orderStatus = newStatus;
  this.statusHistory.push({ status: newStatus, timestamp: new Date(), note });

  // Set deliveredAt timestamp
  if (newStatus === 'Delivered') {
    this.deliveredAt = new Date();
  }
};

// ─── VIRTUALS ────────────────────────────────────────────────────────────────

// Total number of items in the order
OrderSchema.virtual('totalItems').get(function () {
  return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
});

// Whether the order is paid
OrderSchema.virtual('isPaid').get(function () {
  return this.paymentResult?.status === 'completed';
});

// Whether the order can be cancelled
OrderSchema.virtual('isCancellable').get(function () {
  return !['Delivered', 'Cancelled'].includes(this.orderStatus);
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export default Order;
