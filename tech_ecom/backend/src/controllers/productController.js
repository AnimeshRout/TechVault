// PRODUCT CONTROLLER
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';
import slugify from 'slugify';

// ─── GET ALL PRODUCTS (with filters, sort, pagination) ───────────────────────
export const getAllProducts = catchAsync(async (req, res, next) => {
  // Count total matching documents (before pagination)
  const filterQuery = { ...req.query };
  ['page', 'sort', 'limit', 'fields', 'search', 'q'].forEach((el) => delete filterQuery[el]);

  // Build features
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  // Get total count for pagination metadata
  const countFeatures = new APIFeatures(Product.find(), req.query)
    .filter()
    .search();
  const totalProducts = await Product.countDocuments(countFeatures.query.getFilter());

  const page = features.page || 1;
  const limit = features.limit || 12;
  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json({
    status: 'success',
    results: products.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalProducts,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    data: { products },
  });
});

// ─── GET SINGLE PRODUCT BY SLUG ──────────────────────────────────────────────
export const getProductBySlug = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

// ─── GET SINGLE PRODUCT BY ID ────────────────────────────────────────────────
export const getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

// ─── GET FEATURED PRODUCTS ───────────────────────────────────────────────────
export const getFeaturedProducts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 12;

  const products = await Product.find({ isFeatured: true })
    .sort('-rating')
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products },
  });
});

// ─── SEARCH PRODUCTS (with auto-suggestions) ────────────────────────────────
export const searchProducts = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { products: [], suggestions: [] },
    });
  }

  const searchRegex = new RegExp(q, 'i');

  // Get matching products
  const products = await Product.find({
    $or: [
      { title: searchRegex },
      { brand: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
    ],
  })
    .select('title slug brand category price discountPrice images rating stock')
    .limit(20)
    .sort('-rating');

  // Generate auto-suggestions (unique titles and brands)
  const suggestions = [
    ...new Set(
      products
        .map((p) => p.title)
        .concat(products.map((p) => p.brand))
    ),
  ].slice(0, 8);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products, suggestions },
  });
});

// ─── GET PRODUCTS BY CATEGORY ────────────────────────────────────────────────
export const getProductsByCategory = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Product.find({ category: req.params.category }),
    req.query
  )
    .filter()
    .sort()
    .paginate();

  const products = await features.query;
  const total = await Product.countDocuments({ category: req.params.category });

  res.status(200).json({
    status: 'success',
    results: products.length,
    pagination: {
      currentPage: features.page || 1,
      totalPages: Math.ceil(total / (features.limit || 12)),
      totalProducts: total,
    },
    data: { products },
  });
});

// ─── GET ALL BRANDS (for filter sidebar) ─────────────────────────────────────
export const getBrands = catchAsync(async (req, res, next) => {
  const { category } = req.query;
  const match = category ? { category } : {};

  const brands = await Product.aggregate([
    { $match: match },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { brand: '$_id', count: 1, _id: 0 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { brands },
  });
});

// ─── GET PRICE RANGE (for filter sidebar) ────────────────────────────────────
export const getPriceRange = catchAsync(async (req, res, next) => {
  const { category } = req.query;
  const match = category ? { category } : {};

  const range = await Product.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      minPrice: range[0]?.minPrice || 0,
      maxPrice: range[0]?.maxPrice || 10000,
    },
  });
});

// ─── CREATE PRODUCT (Admin Only) ─────────────────────────────────────────────
export const createProduct = catchAsync(async (req, res, next) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Product created successfully',
    data: { product },
  });
});

// ─── UPDATE PRODUCT (Admin Only) ─────────────────────────────────────────────
export const updateProduct = catchAsync(async (req, res, next) => {
  // If title is being updated, regenerate slug
  if (req.body.title) {
    req.body.slug = slugify(req.body.title, { lower: true, strict: true });
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Product updated successfully',
    data: { product },
  });
});

// ─── DELETE PRODUCT (Admin Only) ─────────────────────────────────────────────
export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Product deleted successfully',
  });
});

// ─── BATCH STOCK UPDATE (Admin Only) ─────────────────────────────────────────
export const batchUpdateStock = catchAsync(async (req, res, next) => {
  const { updates } = req.body; // Array of { productId, stock }

  if (!Array.isArray(updates) || updates.length === 0) {
    return next(new AppError('Please provide an array of stock updates.', 400));
  }

  const bulkOps = updates.map(({ productId, stock }) => ({
    updateOne: {
      filter: { _id: productId },
      update: { $set: { stock } },
    },
  }));

  const result = await Product.bulkWrite(bulkOps);

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} products updated`,
    data: { modifiedCount: result.modifiedCount },
  });
});

// ─── SEARCH SUGGESTIONS (prefix autocomplete) ───────────────────────────────
export const getSearchSuggestions = catchAsync(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({ status: 'success', data: { suggestions: [] } });
  }

  const regex = new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

  const suggestions = await Product.find({
    $or: [
      { title: regex },
      { brand: regex },
      { category: regex },
    ],
  })
    .select('title slug category brand images price')
    .limit(8)
    .lean();

  res.status(200).json({
    status: 'success',
    data: { suggestions },
  });
});

// ─── ADMIN: Export Products CSV ──────────────────────────────────────────────
export const exportProductsCSV = catchAsync(async (req, res) => {
  const products = await Product.find().lean();

  const headers = ['ID', 'Title', 'Category', 'Brand', 'Price', 'Discount Price', 'Stock', 'Rating', 'Num Reviews', 'Created'];
  const rows = products.map((p) => [
    p._id,
    `"${(p.title || '').replace(/"/g, '""')}"`,
    p.category,
    p.brand,
    p.price,
    p.discountPrice || '',
    p.stock,
    p.rating?.average || 0,
    p.rating?.count || 0,
    new Date(p.createdAt).toISOString(),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=techvault-products.csv');
  res.send(csv);
});

