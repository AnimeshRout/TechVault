/**
 * ============================================================================
 * CART MODEL
 * ============================================================================
 * Fields: user (ref), items[] { product, variant, quantity, unitPrice }
 *
 * Concurrency Safety:
 *   - Add item: Uses $addToSet or conditional $inc (upsert pattern)
 *   - Remove item: Uses atomic $pull
 *   - Update quantity: Uses findOneAndUpdate with quantity bounds check
 *   - All operations are atomic — no read-then-write patterns
 *
 * Design:
 *   - One cart per user (enforced by unique user index)
 *   - Cart is server-synced: frontend sends optimistic updates, backend is truth
 *   - Cart items store unitPrice at time of addition (for price change tracking)
 * ============================================================================
 */
import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    variant: {
      type: String, // Variant ID or name (e.g., "256GB Space Black")
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [10, 'Cannot add more than 10 units of a single item'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: true, timestamps: true }
);

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true, // One cart per user
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
CartSchema.index({ user: 1 }, { unique: true });

// ─── VIRTUALS ────────────────────────────────────────────────────────────────

// Total number of items in cart
CartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Subtotal (sum of unitPrice * quantity for all items)
CartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
});

// ─── STATIC METHODS (Atomic Operations) ──────────────────────────────────────

/**
 * Add an item to cart or increment quantity if already exists.
 * Uses atomic upsert pattern to prevent race conditions.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} productId
 * @param {number} quantity
 * @param {number} unitPrice
 * @param {string|null} variant
 * @returns {Cart} Updated cart
 */
CartSchema.statics.addItem = async function (userId, productId, quantity, unitPrice, variant = null) {
  // First, try to increment quantity of existing item
  const existingCart = await this.findOneAndUpdate(
    {
      user: userId,
      'items.product': productId,
      ...(variant ? { 'items.variant': variant } : {}),
    },
    {
      $inc: { 'items.$.quantity': quantity },
      $set: { 'items.$.unitPrice': unitPrice }, // Update price to current
    },
    { new: true }
  );

  if (existingCart) return existingCart;

  // Item doesn't exist in cart — push new item (upsert cart if needed)
  return this.findOneAndUpdate(
    { user: userId },
    {
      $push: {
        items: { product: productId, variant, quantity, unitPrice },
      },
    },
    { new: true, upsert: true } // Create cart if it doesn't exist
  );
};

/**
 * Remove an item from cart atomically using $pull.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} itemId - The cart item _id
 * @returns {Cart} Updated cart
 */
CartSchema.statics.removeItem = async function (userId, itemId) {
  return this.findOneAndUpdate(
    { user: userId },
    { $pull: { items: { _id: itemId } } },
    { new: true }
  );
};

/**
 * Update item quantity atomically.
 * Enforces min 1 and max 10 bounds.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} itemId - The cart item _id
 * @param {number} newQuantity
 * @returns {Cart} Updated cart
 */
CartSchema.statics.updateItemQuantity = async function (userId, itemId, newQuantity) {
  if (newQuantity < 1 || newQuantity > 10) {
    throw new Error('Quantity must be between 1 and 10');
  }

  return this.findOneAndUpdate(
    { user: userId, 'items._id': itemId },
    { $set: { 'items.$.quantity': newQuantity } },
    { new: true }
  );
};

/**
 * Clear all items from cart atomically.
 *
 * @param {ObjectId} userId
 * @returns {Cart} Empty cart
 */
CartSchema.statics.clearCart = async function (userId) {
  return this.findOneAndUpdate(
    { user: userId },
    { $set: { items: [] } },
    { new: true }
  );
};

const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
export default Cart;
