/**
 * Global Error Handler Middleware
 * Catches all errors forwarded by next(err) or catchAsync.
 * Differentiates between operational and programming errors.
 * Sends structured JSON responses with appropriate status codes.
 */
import AppError from '../utils/AppError.js';

/**
 * Handle Mongoose CastError (invalid ObjectId, etc.)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error (code 11000)
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value "${value}" for field "${field}". Please use a different value.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Invalid Token Error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT Expired Token Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401);
};

/**
 * Send detailed error in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Send clean error in production (hide internal details)
 */
const sendErrorProd = (err, res) => {
  // Operational errors: trusted, send to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming errors: don't leak details to client
    console.error('💥 PROGRAMMING ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

export default errorHandler;
