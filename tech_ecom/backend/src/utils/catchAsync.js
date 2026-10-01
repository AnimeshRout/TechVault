/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express's global error handler.
 *
 * Usage:
 *   router.get('/products', catchAsync(async (req, res) => { ... }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
