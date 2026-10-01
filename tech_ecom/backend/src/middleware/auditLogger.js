/**
 * ============================================================================
 * AUDIT LOGGER MIDDLEWARE
 * ============================================================================
 * Logs admin actions + failed authorization attempts.
 * Usage: auditLog('CREATE', 'product', { description: '...' })
 * ============================================================================
 */
import AuditLog from '../models/AuditLog.js';

/**
 * Create an audit log entry.
 * @param {Object} options
 * @param {string} options.action - CREATE/UPDATE/DELETE/AUTH_DENIED/etc.
 * @param {string} options.resource - product/order/user/auth/system
 * @param {string} options.resourceId - ID of the resource
 * @param {Object} options.user - req.user object (may be null for auth failures)
 * @param {string} options.description - What happened
 * @param {Object} options.changes - Before/after diff
 * @param {Object} options.req - Express request (for IP, userAgent)
 * @param {number} options.statusCode - HTTP status code
 */
export async function logAudit({
  action,
  resource,
  resourceId = '',
  user = null,
  description = '',
  changes = null,
  req = null,
  statusCode = 200,
}) {
  try {
    await AuditLog.create({
      action,
      resource,
      resourceId: resourceId?.toString() || '',
      user: user?._id || null,
      userName: user?.name || 'Unknown',
      userEmail: user?.email || '',
      description,
      changes,
      ip: req?.ip || req?.connection?.remoteAddress || '',
      userAgent: req?.headers?.['user-agent'] || '',
      statusCode,
    });
  } catch (err) {
    // Never let audit logging crash the request
    console.error('⚠️ Audit log write failed:', err.message);
  }
}

/**
 * Middleware that logs failed authorization (403/401) in the RBAC layer.
 * Wrap around the authorize() middleware.
 */
export function auditAuthDenied(req, res, next) {
  // Store original json to intercept 403 responses
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (res.statusCode === 403 || res.statusCode === 401) {
      logAudit({
        action: 'AUTH_DENIED',
        resource: 'auth',
        resourceId: req.originalUrl,
        user: req.user || null,
        description: `Unauthorized access attempt to ${req.method} ${req.originalUrl}`,
        req,
        statusCode: res.statusCode,
      });
    }
    return originalJson(body);
  };

  next();
}
