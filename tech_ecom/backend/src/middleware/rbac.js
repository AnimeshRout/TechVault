/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access based on user roles.
 *
 * Usage:
 *   router.delete('/product/:id', protect, authorize('admin'), deleteProduct);
 *   router.get('/orders', protect, authorize('admin', 'user'), getOrders);
 */
import AppError from '../utils/AppError.js';

/**
 * Authorize specific roles to access a route
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'user')
 * @returns Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // protect middleware must run first to set req.user
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role "${req.user.role}" is not authorized to perform this action.`,
          403
        )
      );
    }

    next();
  };
};

export { authorize };
export default authorize;
