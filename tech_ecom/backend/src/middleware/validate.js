/**
 * Request Validation Middleware using Joi
 * Validates req.body, req.params, and req.query against Joi schemas.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), register);
 */
import AppError from '../utils/AppError.js';

/**
 * Creates a validation middleware for a given Joi schema
 * @param {Object} schema - Joi validation schema object
 * @param {string} source - Request property to validate ('body' | 'params' | 'query')
 * @returns Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,    // Return all errors, not just the first
      stripUnknown: true,   // Remove unknown fields for security
      allowUnknown: false,  // Reject unknown fields
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join('. ');
      return next(new AppError(errorMessages, 400));
    }

    // Replace request data with validated + sanitized data
    req[source] = value;
    next();
  };
};

export default validate;
