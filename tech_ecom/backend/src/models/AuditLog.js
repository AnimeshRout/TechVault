/**
 * ============================================================================
 * AUDIT LOG MODEL
 * ============================================================================
 * Tracks all admin mutations AND failed authorization attempts.
 * ============================================================================
 */
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'BULK_DELETE', 'BULK_UPDATE',
        'STATUS_CHANGE', 'ROLE_CHANGE', 'LOGIN', 'LOGIN_FAILED',
        'AUTH_DENIED', 'PASSWORD_RESET', 'REFUND', 'EXPORT',
      ],
    },
    resource: {
      type: String,
      required: true,
      enum: ['product', 'order', 'user', 'coupon', 'review', 'system', 'auth'],
    },
    resourceId: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: { type: String, default: 'Unknown' },
    userEmail: { type: String, default: '' },
    description: { type: String, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    statusCode: { type: Number, default: 200 },
  },
  { timestamps: true }
);

// TTL index: auto-delete audit logs after 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
