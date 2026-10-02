// STOCK SERVICE — Reservation management
import StockReservation from '../models/StockReservation.js';
import Product from '../models/Product.js';

/**
 * Reserve stock for a cart item.
 * @param {string} productId
 * @param {number} quantity
 * @param {string|null} userId
 * @param {string|null} sessionId
 */
export async function reserveStock(productId, quantity, userId = null, sessionId = null) {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  // Check existing reservation by this user/session
  const query = { product: productId };
  if (userId) query.user = userId;
  else if (sessionId) query.sessionId = sessionId;

  const existing = await StockReservation.findOne(query);

  // Calculate total reserved for this product (excluding current user)
  const otherReservations = await StockReservation.aggregate([
    {
      $match: {
        product: product._id,
        ...(existing ? { _id: { $ne: existing._id } } : {}),
      },
    },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);

  const totalReserved = otherReservations[0]?.total || 0;
  const availableStock = product.stock - totalReserved;

  if (quantity > availableStock) {
    throw new Error(`Only ${availableStock} units available for "${product.title}".`);
  }

  if (existing) {
    // Update existing reservation
    existing.quantity = quantity;
    existing.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await existing.save();
    return existing;
  }

  // Create new reservation
  return StockReservation.create({
    product: productId,
    quantity,
    user: userId,
    sessionId,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
}

/**
 * Release stock reservation (on checkout completion or cart removal)
 */
export async function releaseStock(productId, userId = null, sessionId = null) {
  const query = { product: productId };
  if (userId) query.user = userId;
  else if (sessionId) query.sessionId = sessionId;

  await StockReservation.deleteMany(query);
}

/**
 * Release all reservations for a user (after successful order)
 */
export async function releaseAllUserStock(userId) {
  await StockReservation.deleteMany({ user: userId });
}

/**
 * Get available stock (total stock minus active reservations)
 */
export async function getAvailableStock(productId) {
  const product = await Product.findById(productId);
  if (!product) return 0;

  const reservations = await StockReservation.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);

  const totalReserved = reservations[0]?.total || 0;
  return Math.max(0, product.stock - totalReserved);
}
