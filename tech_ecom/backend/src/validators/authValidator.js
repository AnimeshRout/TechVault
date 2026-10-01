/**
 * Auth Request Validators — Joi Schemas
 * Validates registration, login, and password update payloads.
 */
import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required',
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({ 'any.required': 'Current password is required' }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base':
        'New password must include uppercase, lowercase, number, and special character',
      'any.required': 'New password is required',
    }),
});

export const addressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(10).max(15).required(),
  street: Joi.string().trim().min(5).max(200).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  zipCode: Joi.string().trim().min(4).max(10).required(),
  country: Joi.string().trim().min(2).max(100).required(),
  isDefault: Joi.boolean().default(false),
});
