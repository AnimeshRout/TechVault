/**
 * ============================================================================
 * PRODUCT MODEL
 * ============================================================================
 * Fields: title, slug (unique), brand, category (enum), price, discountPrice,
 *         stock, images[], description, specs (Map), variants[], averageRating,
 *         numReviews, isFeatured
 *
 * Concurrency & Safety:
 *   - All stock mutations MUST use atomic $inc with guard: { stock: { $gte: qty } }
 *   - Never read-then-write stock — always findOneAndUpdate atomically
 *   - Text index on title + brand + description for fast search
 *
 * Indexes:
 *   - { slug: 1 }              unique — URL-friendly product lookup
 *   - { category: 1, brand: 1 } compound — catalog filtering
 *   - { title: 'text', brand: 'text', description: 'text' } — full-text search
 *   - { isFeatured: 1 }        — featured products query
 *   - { price: 1 }             — price sort/filter
 * ============================================================================
 */
import mongoose from 'mongoose';
import slugify from 'slugify';

// Variant sub-schema (e.g., color: "Space Black", storage: "512GB")
const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },        // e.g., "256GB Space Black"
    sku: { type: String, trim: true },                          // Stock Keeping Unit
    color: { type: String, trim: true },
    storage: { type: String, trim: true },                      // "256GB", "512GB", etc.
    price: { type: Number, required: true },                    // Variant-specific price
    stock: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: true }
);

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['mobiles', 'laptops', 'tablets', 'audio', 'pc-components', 'gaming-gear'],
        message: 'Category must be one of: mobiles, laptops, tablets, audio, pc-components, gaming-gear',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (val) {
          // discountPrice must be less than price (or 0 for no discount)
          return val === 0 || val < this.price;
        },
        message: 'Discount price ({VALUE}) must be less than the regular price',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    images: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length >= 1;
        },
        message: 'At least one product image is required',
      },
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    // Key-value technical specifications (e.g., { Processor: "M3 Max", RAM: "64GB" })
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    // Variants for color/storage/config options
    variants: [variantSchema],
    // Auto-calculated from reviews
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal place
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
// Compound index for category + brand filtering
ProductSchema.index({ category: 1, brand: 1 });

// Text index for full-text search across title, brand, and description
ProductSchema.index(
  { title: 'text', brand: 'text', description: 'text' },
  { weights: { title: 10, brand: 5, description: 1 } } // Title matches rank highest
);

// Featured products quick lookup
ProductSchema.index({ isFeatured: 1 });

// Price-based sorting/filtering
ProductSchema.index({ price: 1 });

// Stock-based queries (low stock alerts)
ProductSchema.index({ stock: 1 });

// ─── VIRTUALS ────────────────────────────────────────────────────────────────
// Calculate effective price (discounted or regular)
ProductSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice > 0 ? this.discountPrice : this.price;
});

// Calculate discount percentage
ProductSchema.virtual('discountPercentage').get(function () {
  if (this.discountPrice > 0 && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Check if product is in stock
ProductSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ─── PRE-SAVE HOOK: Auto-generate slug ───────────────────────────────────────
ProductSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true, // Remove special characters
      trim: true,
    });
    // Append a short unique suffix to prevent slug collisions
    if (this.isNew) {
      this.slug += `-${this._id.toString().slice(-6)}`;
    }
  }
  next();
});

// ─── STATIC METHODS ──────────────────────────────────────────────────────────

/**
 * CONCURRENCY-SAFE stock decrement
 * Uses atomic findOneAndUpdate with stock guard to prevent overselling.
 * This is the ONLY way stock should be decremented.
 *
 * @param {ObjectId} productId - Product to decrement
 * @param {number} quantity - Quantity to subtract
 * @param {ClientSession} [session] - MongoDB session for transaction
 * @returns {Product|null} Updated product, or null if insufficient stock
 */
ProductSchema.statics.decrementStock = async function (productId, quantity, session = null) {
  const options = { new: true };
  if (session) options.session = session;

  return this.findOneAndUpdate(
    {
      _id: productId,
      stock: { $gte: quantity }, // GUARD: Only decrement if enough stock exists
    },
    {
      $inc: { stock: -quantity }, // ATOMIC: Decrement in single operation
    },
    options
  );
};

/**
 * CONCURRENCY-SAFE stock increment (for order cancellations/returns)
 *
 * @param {ObjectId} productId - Product to increment
 * @param {number} quantity - Quantity to add back
 * @param {ClientSession} [session] - MongoDB session for transaction
 * @returns {Product} Updated product
 */
ProductSchema.statics.incrementStock = async function (productId, quantity, session = null) {
  const options = { new: true };
  if (session) options.session = session;

  return this.findOneAndUpdate(
    { _id: productId },
    { $inc: { stock: quantity } },
    options
  );
};

/**
 * Recalculate average rating and review count from Review collection.
 * Called from Review model's post-save/remove hooks.
 *
 * @param {ObjectId} productId - Product to recalculate for
 */
ProductSchema.statics.calcAverageRating = async function (productId) {
  const Review = mongoose.model('Review');

  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(productId, {
      rating: stats[0].avgRating,
      numReviews: stats[0].numReviews,
    });
  } else {
    await this.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
};

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export default Product;
