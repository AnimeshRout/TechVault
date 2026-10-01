/**
 * ============================================================================
 * REVIEW MODEL
 * ============================================================================
 * Fields: user (ref), product (ref), rating (1-5), comment, verifiedPurchase
 *
 * Constraints:
 *   - One review per product per user (compound unique index)
 *   - Rating 1-5 integer only
 *   - verifiedPurchase auto-set by checking user's order history
 *
 * Hooks:
 *   - post-save & post-findOneAndDelete: Recalculates product averageRating
 *     and numReviews using aggregation pipeline
 *
 * Indexes:
 *   - { product: 1, user: 1 } unique — one review per user per product
 *   - { product: 1, createdAt: -1 }  — product reviews sorted by newest
 * ============================================================================
 */
import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must be for a product'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [5, 'Comment must be at least 5 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    // Admin moderation
    isApproved: {
      type: Boolean,
      default: true,
    },
    // Helpful votes
    helpfulCount: {
      type: Number,
      default: 0,
    },
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Review images (Cloudinary URLs)
    images: [
      {
        type: String,
        validate: {
          validator: (v) => /^https?:\/\/.+/i.test(v),
          message: 'Image must be a valid URL',
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
// One review per user per product (prevents duplicate reviews)
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Product reviews sorted by newest (for product detail page)
ReviewSchema.index({ product: 1, createdAt: -1 });

// ─── STATIC METHOD: Recalculate Product Rating ──────────────────────────────
/**
 * Recalculates the average rating and review count for a product.
 * Uses MongoDB aggregation pipeline for accuracy.
 *
 * @param {ObjectId} productId
 */
ReviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  const Product = mongoose.model('Product');

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].numReviews,
    });
  } else {
    // No approved reviews left — reset to defaults
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
};

// ─── POST-SAVE HOOK: Recalculate rating after new review ─────────────────────
ReviewSchema.post('save', async function () {
  // `this` is the review document
  // `this.constructor` is the Review model
  await this.constructor.calcAverageRating(this.product);
});

// ─── POST-DELETE HOOK: Recalculate rating after review deletion ──────────────
// Works with findOneAndDelete, findByIdAndDelete
ReviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

// Also handle deleteOne
ReviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.calcAverageRating(this.product);
});

// ─── PRE-SAVE HOOK: Check verified purchase ──────────────────────────────────
ReviewSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Check if the user has purchased this product
    const Order = mongoose.model('Order');
    const hasOrdered = await Order.findOne({
      user: this.user,
      'orderItems.product': this.product,
      orderStatus: { $in: ['Delivered', 'Shipped', 'Processing'] },
      'paymentResult.status': 'completed',
    });

    this.verifiedPurchase = !!hasOrdered;
  }
  next();
});

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
export default Review;
