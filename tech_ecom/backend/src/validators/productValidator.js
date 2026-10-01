/**
 * Product Request Validators — Joi Schemas
 * Validates product creation and update payloads.
 */
import Joi from 'joi';

const validCategories = ['mobiles', 'laptops', 'tablets', 'audio', 'pc-components', 'gaming-gear'];

export const createProductSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required()
    .messages({ 'any.required': 'Product title is required' }),
  brand: Joi.string().trim().min(1).max(100).required()
    .messages({ 'any.required': 'Brand is required' }),
  category: Joi.string().valid(...validCategories).required()
    .messages({
      'any.only': `Category must be one of: ${validCategories.join(', ')}`,
      'any.required': 'Category is required',
    }),
  price: Joi.number().positive().precision(2).required()
    .messages({ 'any.required': 'Price is required' }),
  discountPrice: Joi.number().min(0).precision(2).default(0),
  stock: Joi.number().integer().min(0).required()
    .messages({ 'any.required': 'Stock quantity is required' }),
  images: Joi.array().items(Joi.string().uri()).min(1).max(10)
    .messages({ 'array.min': 'At least one product image is required' }),
  description: Joi.string().trim().min(10).max(5000).required()
    .messages({ 'any.required': 'Description is required' }),
  specs: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  isFeatured: Joi.boolean().default(false),
});

export const updateProductSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  brand: Joi.string().trim().min(1).max(100),
  category: Joi.string().valid(...validCategories),
  price: Joi.number().positive().precision(2),
  discountPrice: Joi.number().min(0).precision(2),
  stock: Joi.number().integer().min(0),
  images: Joi.array().items(Joi.string().uri()).min(1).max(10),
  description: Joi.string().trim().min(10).max(5000),
  specs: Joi.object().pattern(Joi.string(), Joi.string()),
  isFeatured: Joi.boolean(),
}).min(1); // At least one field must be provided for update

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
  sort: Joi.string().trim(),
  fields: Joi.string().trim(),
  search: Joi.string().trim().max(200),
  q: Joi.string().trim().max(200),
  category: Joi.string().trim(),
  brand: Joi.string().trim(),
  rating: Joi.number().min(0).max(5),
  inStock: Joi.string().valid('true', 'false'),
  isFeatured: Joi.string().valid('true', 'false'),
  'price[gte]': Joi.number().min(0),
  'price[lte]': Joi.number().min(0),
  'price[gt]': Joi.number().min(0),
  'price[lt]': Joi.number().min(0),
}).unknown(true); // Allow MongoDB operator syntax in query
