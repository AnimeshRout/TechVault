/**
 * ============================================================================
 * REVIEW CONTROLLER
 * ============================================================================
 * CRUD for product reviews with verified purchase auto-detection
 * and automatic product rating recalculation.
 * ============================================================================
 */
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// ─── GET REVIEWS FOR A PRODUCT ───────────────────────────────────────────────
export const getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const sort = req.query.sort || '-createdAt'; // Default newest first

  const reviews = await Review.find({ product: productId, isApproved: true })
    .populate('user', 'name avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ product: productId, isApproved: true });

  // Rating distribution (1-5 stars breakdown)
  const ratingDistribution = await Review.aggregate([
    { $match: { product: new (await import('mongoose')).default.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  const distribution = {};
  for (let i = 1; i <= 5; i++) {
    const found = ratingDistribution.find((r) => r._id === i);
    distribution[i] = found ? found.count : 0;
  }

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
    },
    data: {
      reviews,
      ratingDistribution: distribution,
    },
  });
});

// ─── CREATE REVIEW ───────────────────────────────────────────────────────────
export const createReview = catchAsync(async (req, res, next) => {
  const { product, rating, comment } = req.body;

  // Check if product exists
  const productExists = await Product.findById(product);
  if (!productExists) {
    return next(new AppError('Product not found.', 404));
  }

  // Check for existing review (enforced by compound index too)
  const existingReview = await Review.findOne({
    user: req.user._id,
    product,
  });

  if (existingReview) {
    return next(
      new AppError('You have already reviewed this product. You can edit your existing review.', 409)
    );
  }

  // Create review (verifiedPurchase is auto-set by pre-save hook)
  const review = await Review.create({
    user: req.user._id,
    product,
    rating,
    comment,
  });

  // Populate user info
  await review.populate('user', 'name avatar');

  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully',
    data: { review },
  });
});

// ─── UPDATE REVIEW ───────────────────────────────────────────────────────────
export const updateReview = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;

  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found.', 404));
  }

  // Users can only update their own reviews
  if (review.user.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own reviews.', 403));
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  await review.save(); // Triggers post-save hook for rating recalculation

  await review.populate('user', 'name avatar');

  res.status(200).json({
    status: 'success',
    message: 'Review updated successfully',
    data: { review },
  });
});

// ─── DELETE REVIEW ───────────────────────────────────────────────────────────
export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('Review not found.', 404));
  }

  // Users can delete their own reviews, admins can delete any
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('You can only delete your own reviews.', 403));
  }

  await Review.findByIdAndDelete(req.params.id); // Triggers post-findOneAndDelete hook

  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully',
  });
});
