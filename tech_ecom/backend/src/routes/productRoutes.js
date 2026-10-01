/**
 * Product Routes
 * GET    /api/products            — Get all products (filters/sort/paginate)
 * GET    /api/products/search     — Search with auto-suggestions
 * GET    /api/products/featured   — Get featured products
 * GET    /api/products/brands     — Get all brands (for filter sidebar)
 * GET    /api/products/price-range — Get min/max price (for slider)
 * GET    /api/products/category/:category — Products by category
 * GET    /api/products/slug/:slug — Get single product by slug
 * GET    /api/products/:id        — Get single product by ID
 */
import express from 'express';
import {
  getAllProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  searchProducts,
  getSearchSuggestions,
  getProductsByCategory,
  getBrands,
  getPriceRange,
  createProduct,
  updateProduct,
  deleteProduct,
  batchUpdateStock,
  exportProductsCSV,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/search', searchLimiter, searchProducts);
router.get('/suggestions', searchLimiter, getSearchSuggestions);
router.get('/featured', getFeaturedProducts);
router.get('/brands', getBrands);
router.get('/price-range', getPriceRange);
router.get('/category/:category', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Admin-only routes
router.post('/', protect, authorize('admin'), validate(createProductSchema), createProduct);
router.put('/:id', protect, authorize('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.put('/batch/stock', protect, authorize('admin'), batchUpdateStock);
router.get('/admin/export', protect, authorize('admin'), exportProductsCSV);

export default router;
