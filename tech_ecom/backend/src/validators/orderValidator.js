/**
 * Order Request Validators — Joi Schemas
 */
import Joi from 'joi';

export const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().min(10).max(15).required(),
    street: Joi.string().trim().min(5).max(200).required(),
    city: Joi.string().trim().min(2).max(100).required(),
    state: Joi.string().trim().min(2).max(100).required(),
    zipCode: Joi.string().trim().min(4).max(10).required(),
    country: Joi.string().trim().min(2).max(100).required(),
  }).required(),
  paymentMethod: Joi.string().valid('stripe', 'razorpay', 'cod').default('stripe'),
});

export const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid('Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')
    .required()
    .messages({
      'any.only': 'Order status must be one of: Placed, Processing, Shipped, Delivered, Cancelled',
      'any.required': 'Order status is required',
    }),
  note: Joi.string().max(500).allow('').default(''),
  trackingNumber: Joi.string().max(100).allow('').default(''),
});

