/**
 * Custom Application Error Class
 * Extends the native Error to include HTTP status codes and operational flags.
 * Only operational errors (isOperational = true) are sent as user-facing messages.
 * Programming errors (bugs) are handled generically for security.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace without including this constructor in the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
