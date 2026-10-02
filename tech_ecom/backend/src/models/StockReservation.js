// STOCK RESERVATION MODEL
import mongoose from 'mongoose';

const StockReservationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 min TTL
    },
  },
  { timestamps: true }
);

// ─── TTL INDEX — MongoDB auto-deletes expired docs ───────────────────────────
StockReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for fast lookups
StockReservationSchema.index({ product: 1, user: 1 });
StockReservationSchema.index({ product: 1, sessionId: 1 });
StockReservationSchema.index({ user: 1 });
StockReservationSchema.index({ sessionId: 1 });

const StockReservation =
  mongoose.models.StockReservation ||
  mongoose.model('StockReservation', StockReservationSchema);

export default StockReservation;
