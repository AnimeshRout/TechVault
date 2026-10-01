/**
 * STOCK NOTIFICATION MODEL — Back-in-stock email alerts
 */
import mongoose from 'mongoose';

const StockNotificationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

StockNotificationSchema.index({ product: 1, email: 1 }, { unique: true });
StockNotificationSchema.index({ product: 1, notified: 1 });

const StockNotification =
  mongoose.models.StockNotification ||
  mongoose.model('StockNotification', StockNotificationSchema);

export default StockNotification;
