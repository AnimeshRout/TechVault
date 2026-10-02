// USER MODEL
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSubSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either user or admin',
      },
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addresses: [addressSubSchema],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    refreshToken: {
      type: String,
      select: false, // Never returned in queries
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },

    // ─── ACCOUNT LOCKOUT ──────────────────────────────────────────────
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },

    // ─── PASSWORD RESET ───────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ─── EMAIL VERIFICATION ───────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });

// ─── PRE-SAVE HOOK: Hash password ────────────────────────────────────────────
// Only runs when the password field is modified (create or update)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash with bcryptjs — 12 salt rounds (industry recommended)
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Track when password was changed (for JWT invalidation)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure JWT issued after
  }

  next();
});

// ─── INSTANCE METHODS ────────────────────────────────────────────────────────

/**
 * Compare a candidate password with the stored hashed password
 * @param {string} candidatePassword - Plain text password to check
 * @returns {Promise<boolean>} True if passwords match
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if user changed password after a JWT was issued
 * @param {number} jwtTimestamp - The iat (issued at) from JWT payload
 * @returns {boolean} True if password was changed after token was issued
 */
UserSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// ─── ACCOUNT LOCKOUT METHODS ─────────────────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Check if account is currently locked
 */
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Increment failed login attempts; lock after MAX_LOGIN_ATTEMPTS
 */
UserSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock if reaching max attempts
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

/**
 * Reset login attempts after successful login
 */
UserSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// ─── PASSWORD RESET TOKEN ────────────────────────────────────────────────────

import crypto from 'crypto';

/**
 * Generate a hashed password reset token (SHA-256)
 * Returns the UNHASHED token to send in the email.
 * Stores the HASHED token in the DB.
 */
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Store hashed version
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken; // Send this in the email
};

/**
 * Generate email verification token
 */
UserSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verifyToken;
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;

