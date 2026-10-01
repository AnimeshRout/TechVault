/**
 * Review Request Validators — Joi Schemas
 */
import Joi from 'joi';

export const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required',
    }),
  comment: Joi.string().trim().min(5).max(1000).required()
    .messages({
      'string.min': 'Review comment must be at least 5 characters',
      'string.max': 'Review comment cannot exceed 1000 characters',
      'any.required': 'Review comment is required',
    }),
  product: Joi.string().hex().length(24).required()
    .messages({
      'any.required': 'Product ID is required',
      'string.hex': 'Invalid product ID format',
    }),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().trim().min(5).max(1000),
}).min(1);
